// Salas de Head Fighter. No sabe nada del juego: junta a dos jugadores por un código, reenvía
// sus mensajes de señalización WebRTC y les da los servidores STUN/TURN.
//
// WebSocket en /sala/ABCD, mensajes JSON:
//   cliente → hola{v, rol:'crear'|'unirse', token?} · senal{data} · adios
//   sala    → sala{code, asiento, token} · emparejados{ice, ronda} · senal{data}
//             rival-fuera{definitivo}
//             error{code:'llena'|'no-existe'|'ocupada'|'version'|'origen'|'caducada'|'abuso'}
// El texto 'ping' se contesta con 'pong' sin despertar la sala; quien deja de mandarlo se da
// por caído. Una señal enviada mientras el rival no está se pierde: tras cada `emparejados`
// (ronda nueva) hay que negociar de cero.
import { DurableObject } from 'cloudflare:workers';

const PROTO = 1;
const MAX_MESSAGE = 16 * 1024;
const BURST = { messages: 100, ms: 10_000 };
const FRESH_MS = 20_000; // el cliente manda un ping cada 8 s
const TURN_TTL = 3600; // segundos de vida de las credenciales
const TURN_REUSE_MS = 30 * 60_000; // se reutilizan mientras les quede al menos otro tanto
const STUN = { urls: ['stun:stun.cloudflare.com:3478'] };
const ROUTE = /^\/sala\/([A-HJ-NP-Z]{4})$/;
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\]|10(\.\d+){3}|192\.168(\.\d+){2}|172\.(1[6-9]|2\d|3[01])(\.\d+){2})$/;

/**
 * Impide que otras webs usen las salas desde el navegador. Sin cabecera Origin (apps nativas,
 * scripts) se admite: no se puede comprobar. Contra el abuso están los límites por IP.
 */
function originAllowed(origin, env) {
  if (!origin) return true;
  if ((env.ALLOWED_ORIGINS || '').split(',').some((o) => o.trim() === origin)) return true;
  try {
    return LOCAL_HOST.test(new URL(origin).hostname);
  } catch {
    return false;
  }
}

/** true si la clave sigue dentro del límite (o no hay limitador configurado). */
const within = async (limiter, key) => !limiter || (await limiter.limit({ key })).success;

const send = (ws, msg) => {
  try {
    ws.send(JSON.stringify(msg));
  } catch {
    /* conexión ya cerrada */
  }
};

const close = (ws) => {
  try {
    ws.close(1000);
  } catch {
    /* ya cerrada */
  }
};

/** Acepta la conexión solo para explicar el rechazo (el navegador no deja leer un error HTTP). */
function refuse(code) {
  const [client, server] = Object.values(new WebSocketPair());
  server.accept();
  send(server, { t: 'error', code });
  close(server);
  return new Response(null, { status: 101, webSocket: client });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    const match = pathname.match(ROUTE);
    if (!match) return new Response(pathname === '/' ? 'Head Fighter: salas' : 'No encontrado', { status: pathname === '/' ? 200 : 404 });
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Se esperaba un WebSocket', { status: 426 });
    if (!originAllowed(request.headers.get('Origin'), env)) return refuse('origen');
    if (!(await within(env.CONNECT_LIMIT, request.headers.get('CF-Connecting-IP') || 'local'))) return refuse('abuso');
    return env.ROOMS.get(env.ROOMS.idFromName(match[1])).fetch(request);
  },
};

/**
 * Estado guardado: { seats: [asiento0, asiento1], expires, round, ice? }
 *  asiento = { token, leftAt } o null; leftAt = cuándo se cayó (null si está conectado)
 *  expires = cuándo caduca la sala si siguen faltando jugadores (null con los dos)
 *  round = número de emparejamiento
 * Cada conexión lleva adjunto { code, ip, seat, born, at, n, t0 }.
 */
export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    const ms = (name, fallback) => Number(env[name]) || fallback;
    this.seatMs = ms('SEAT_MS', 60_000); // tiempo para recuperar el asiento
    this.lonelyMs = ms('LONELY_MS', 10 * 60_000); // un jugador esperando
    this.emptyMs = ms('EMPTY_MS', 5 * 60_000); // nadie conectado
    this.helloMs = ms('HELLO_MS', 30_000); // conexión que no llega a decir hola
    this.watchMs = ms('WATCH_MS', 60_000); // cada cuánto se buscan conexiones muertas
    this.staleMs = ms('STALE_MS', 90_000); // silencio que las delata
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  async fetch(request) {
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server); // con hibernación: la espera no consume
    const now = Date.now();
    server.serializeAttachment({
      code: new URL(request.url).pathname.slice(-4),
      ip: request.headers.get('CF-Connecting-IP') || 'local',
      seat: null,
      born: now,
      at: now,
      n: 0,
      t0: now,
    });
    const alarm = await this.ctx.storage.getAlarm();
    if (alarm === null || alarm > now + this.helloMs) await this.ctx.storage.setAlarm(now + this.helloMs);
    return new Response(null, { status: 101, webSocket: client });
  }

  /** Conexiones con asiento, sin contar `except`. */
  seated(except) {
    return this.ctx.getWebSockets().filter((ws) => ws !== except && ws.deserializeAttachment()?.seat != null);
  }

  socketOf(seat, except) {
    return this.seated(except).find((ws) => ws.deserializeAttachment().seat === seat);
  }

  update(ws, changes) {
    ws.serializeAttachment({ ...ws.deserializeAttachment(), ...changes });
  }

  /** Echa una conexión. Quitarle antes el asiento evita que su cierre afecte a la sala. */
  reject(ws, code) {
    this.update(ws, { seat: null });
    send(ws, { t: 'error', code });
    close(ws);
  }

  /** Marca como caídos los asientos sin conexión (el cierre se pierde si la sala se reinicia). */
  reconcile(room) {
    room.seats.forEach((s, i) => {
      if (s && s.leftAt === null && !this.socketOf(i)) s.leftAt = Date.now();
    });
  }

  async webSocketMessage(ws, raw) {
    const meta = ws.deserializeAttachment();
    const now = Date.now();
    const fresh = now - meta.t0 > BURST.ms;
    const n = fresh ? 1 : meta.n + 1;
    this.update(ws, { at: now, n, t0: fresh ? now : meta.t0 });
    if (n > BURST.messages) {
      if (meta.seat !== null) await this.leave(ws, meta.seat, true);
      return this.reject(ws, 'abuso');
    }
    if (typeof raw !== 'string' || raw.length > MAX_MESSAGE) return;
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    const { seat } = meta;
    if (msg?.t === 'hola' && seat === null) return this.join(ws, msg);
    if (seat === null) return;
    if (msg?.t === 'senal') {
      const other = this.socketOf(1 - seat);
      if (other) send(other, { t: 'senal', data: msg.data });
    } else if (msg?.t === 'adios') {
      await this.leave(ws, seat, true);
      close(ws);
    }
  }

  async join(ws, msg) {
    if (msg.v !== PROTO) return this.reject(ws, 'version');
    const now = Date.now();
    let room = await this.ctx.storage.get('room');
    if (room) this.reconcile(room);
    // hasta que los dos han coincidido se espera más: quien crea la sala suele salir de la app
    // para mandar el código
    const keep = room?.met ? this.seatMs : this.emptyMs;
    const alive = (s) => s && (s.leftAt === null || now - s.leftAt < keep);
    if (room && !room.seats.some(alive)) room = undefined;

    let seat;
    if (msg.token) {
      // quien vuelve recupera su asiento o nada: no acaba en otro sitio sin saberlo
      seat = room ? room.seats.findIndex((s) => alive(s) && s.token === msg.token) : -1;
      if (seat < 0) return this.reject(ws, 'caducada');
    } else {
      if (msg.rol === 'crear') {
        if (room) return this.reject(ws, 'ocupada');
        room = { seats: [null, null], expires: null, round: 0 };
        seat = 0;
      } else {
        if (!room) return this.reject(ws, 'no-existe');
        seat = room.seats.findIndex((s) => !alive(s));
        if (seat < 0) return this.reject(ws, 'llena');
      }
      room.seats[seat] = { token: crypto.randomUUID(), leftAt: null };
    }
    // si quedaba una conexión anterior de este asiento, se sustituye
    const old = this.socketOf(seat, ws);
    if (old) {
      this.update(old, { seat: null });
      close(old);
    }
    room.seats[seat].leftAt = null;
    const { code, ip } = ws.deserializeAttachment();
    this.update(ws, { seat });
    await this.save(room);
    send(ws, { t: 'sala', code, asiento: seat, token: room.seats[seat].token });
    if (this.seated().length === 2) await this.pair(ip);
  }

  /** true si la conexión ha dado señales hace poco (una app suspendida parece conectada). */
  fresh(ws) {
    const ping = this.ctx.getWebSocketAutoResponseTimestamp(ws)?.getTime() || 0;
    return Date.now() - Math.max(ws.deserializeAttachment().at, ping) < FRESH_MS;
  }

  async pair(ip) {
    let room = await this.ctx.storage.get('room');
    const round = ++room.round;
    if (this.seated().every((ws) => this.fresh(ws))) room.met = true;
    await this.ctx.storage.put('room', room);
    const cached = room.ice?.until > Date.now() ? room.ice.servers : null;
    const servers = cached || (await this.iceServers(ip));
    // mientras se pedían las credenciales ha podido caerse alguien o haber otro emparejamiento
    room = await this.ctx.storage.get('room');
    if (room?.round !== round || this.seated().length !== 2) return;
    if (!cached && servers.length > 1) {
      room.ice = { servers, until: Date.now() + TURN_REUSE_MS };
      await this.ctx.storage.put('room', room);
    }
    for (const ws of this.seated()) send(ws, { t: 'emparejados', ice: servers, ronda: round });
  }

  /** Guarda la sala y recalcula su caducidad. */
  async save(room, except) {
    const connected = this.seated(except).length;
    room.expires = connected === 2 ? null : Date.now() + (connected ? this.lonelyMs : this.emptyMs);
    await this.ctx.storage.put('room', room);
    await this.schedule(room);
  }

  /** Programa la siguiente revisión: conexiones muertas, sin hola o caducidad de la sala. */
  async schedule(room) {
    const times = [];
    if (room) times.push(Date.now() + this.watchMs, ...(room.expires ? [room.expires] : []));
    for (const ws of this.ctx.getWebSockets()) {
      const meta = ws.deserializeAttachment();
      if (meta?.seat === null && ws.readyState === WebSocket.READY_STATE_OPEN) times.push(meta.born + this.helloMs);
    }
    if (times.length) await this.ctx.storage.setAlarm(Math.max(Date.now() + 100, Math.min(...times)));
    else await this.ctx.storage.deleteAlarm();
  }

  /** @param forGood se va a propósito: el asiento queda libre al momento */
  async leave(ws, seat, forGood) {
    this.update(ws, { seat: null });
    const room = await this.ctx.storage.get('room');
    if (!room?.seats[seat]) return;
    if (forGood) room.seats[seat] = null;
    else room.seats[seat].leftAt = Date.now();
    const other = this.socketOf(1 - seat, ws);
    if (other) send(other, { t: 'rival-fuera', definitivo: forGood });
    if (!room.seats.some(Boolean)) await this.ctx.storage.deleteAll();
    else await this.save(room, ws);
  }

  async webSocketClose(ws) {
    const seat = ws.deserializeAttachment()?.seat;
    if (seat != null) await this.leave(ws, seat, false);
    close(ws);
  }

  async webSocketError(ws) {
    await this.webSocketClose(ws);
  }

  async alarm() {
    const now = Date.now();
    for (const ws of this.ctx.getWebSockets()) {
      const { seat, born, at } = ws.deserializeAttachment();
      if (seat === null) {
        if (now - born >= this.helloMs) this.reject(ws, 'caducada');
        continue;
      }
      const ping = this.ctx.getWebSocketAutoResponseTimestamp(ws)?.getTime() || 0;
      if (now - Math.max(at, ping) > this.staleMs) {
        await this.leave(ws, seat, false);
        close(ws);
      }
    }
    const room = await this.ctx.storage.get('room');
    if (room) {
      this.reconcile(room);
      if (this.seated().length < 2) {
        room.expires ??= now + this.lonelyMs;
        if (now >= room.expires) {
          for (const ws of this.seated()) this.reject(ws, 'caducada');
          await this.ctx.storage.deleteAll();
          return this.schedule();
        }
      }
      await this.ctx.storage.put('room', room);
    }
    await this.schedule(room);
  }

  async iceServers(ip) {
    const { TURN_KEY_ID: id, TURN_API_TOKEN: token, TURN_LIMIT } = this.env;
    if (!id || !token || !(await within(TURN_LIMIT, ip))) return [STUN];
    try {
      const res = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${id}/credentials/generate-ice-servers`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ttl: TURN_TTL }),
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // los navegadores bloquean el puerto 53; una entrada sin direcciones daría error
      const turn = [(await res.json()).iceServers]
        .flat()
        .map((s) => ({ ...s, urls: [s.urls].flat().filter((u) => !/:53(\?|$)/.test(u)) }))
        .filter((s) => s.urls.length);
      return [STUN, ...turn];
    } catch (e) {
      console.error(`TURN no disponible: ${e.message}`);
      return [STUN];
    }
  }
}
