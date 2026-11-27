// Una partida online: sala, conexión con el rival, selección, combates sincronizados y qué pasa
// cuando alguien se va. No toca la pantalla: avisa a main.js. Anfitrión = lado 0 (izquierda);
// invitado = lado 1.
//
// Fases: room → select → vs → fight → result → (revancha: vs) | (cambiar: select)
//
// Mensajes ctl:
//   hola{v, rosterHash, uid}                        al abrirse (o rehacerse) la conexión
//   yo{pick, sel, listo, revancha, preparado, ausente, fin}
//        estado completo de quien lo manda; se repite en cada cambio, así que no se pierde nada
//        al reconectar. Los campos numéricos llevan el número de combate al que se refieren.
//   empezar{to, seed, delay, matchId, picks}        lo decide el anfitrión
//   adios                                           salida voluntaria (abandona)
//   corte{fin}                                      cierra por un fallo, no abandona
// Señales por la sala: sigo{fin} («sigo aquí» mientras la conexión directa no responde) y
// corte{fin}.
import { PROTO } from './config.js';
import { Signaling } from './signaling.js';
import { Peer } from './peer.js';
import { LockstepSession, delayFor } from './lockstep.js';
import { randomSeed } from './rng.js';
import { mix, HASH_START } from './checksum.js';
import { Match } from '../engine/match.js';
import { ROSTER } from '../characters/roster.js';

const SLOW_S = 0.5; // espera a partir de la cual se avisa
const SILENT_MS = 3000; // sin recibir nada: la conexión no responde
const RETRY_MS = 5000; // cada cuánto se rehace la conexión mientras no responda
const SIGO_MS = 1000;
const SIGO_FRESH_MS = 5000;
const LOST_MS = 30_000; // fuera de la app o sin conexión: se pierde
const GRACE_MS = 3000; // margen para que el ausente declare antes su derrota
const DESYNC_S = 5;
const REASONS = ['ko', 'time', 'abandono'];

// si los dos no tienen los mismos personajes (otra versión de la web), el combate divergiría
const rosterHash = () => mix(HASH_START, JSON.stringify(ROSTER));

export const ERRORS = {
  'no-existe': 'No hay ninguna sala con ese código',
  llena: 'La sala ya tiene dos jugadores',
  version: 'Versiones distintas del juego: recargad la página los dos',
  origen: 'Esta web no puede usar las salas',
  caducada: 'La sala ha caducado',
  abuso: 'Demasiados intentos: espera un minuto',
  conexion: 'No se puede conectar con el servidor de salas',
  directa: 'No se ha podido conectar con el otro dispositivo',
  perdida: 'Se ha perdido la conexión',
  adios: 'Tu rival ha salido',
};

// Todo lo que llega del otro dispositivo se comprueba antes de usarlo.
const isPick = (i) => Number.isInteger(i) && i >= 0 && i < ROSTER.length;
const num = (n) => (Number.isInteger(n) && n >= 0 ? n : null);

const validSetup = ({ seed, delay, matchId, picks }) =>
  Number.isInteger(seed) && seed >= 0 &&
  Number.isInteger(delay) && delay >= 1 && delay <= 7 &&
  Number.isInteger(matchId) &&
  Array.isArray(picks) && picks.length === 2 && picks.every(isPick);

const readVerdict = (v) =>
  v && num(v.n) !== null && [-1, 0, 1].includes(v.winner) && REASONS.includes(v.reason)
    ? { n: v.n, winner: v.winner, reason: v.reason }
    : null;

const readState = (m) => ({
  pick: isPick(m.pick) ? m.pick : 0,
  sel: num(m.sel),
  listo: num(m.listo),
  revancha: num(m.revancha),
  preparado: num(m.preparado),
  ausente: m.ausente === true,
  fin: readVerdict(m.fin),
});

export class OnlineGame {
  /**
   * @param controller  mandos locales (poll)
   * @param matchOpts   () → { stage, hooks } para crear cada combate
   * @param pickFor     (side) → personaje marcado de entrada
   * @param on          { status(texto), code(código),
   *                      screen('select' | 'vs' | 'result')  cambio de pantalla,
   *                      change()  ha cambiado algo de la pantalla actual,
   *                      end(códigoDeError)  la partida queda cerrada sin resultado }
   */
  constructor({ controller, matchOpts, pickFor, on }) {
    this.controller = controller;
    this.matchOpts = matchOpts;
    this.pickFor = pickFor;
    this.on = on;
    this.uid = randomSeed();
    this.rivalUid = null;
    this.peer = null;
    this.side = 0;
    this.pick = 0;
    this.closed = false;
    this.rivalGone = false; // el resultado se sigue viendo, pero ya no hay revancha
    this.hidden = false;
    this.lastSigo = 0;
    this.phase = 'room';
    this.reset();
    this.signaling = new Signaling({
      on: {
        sala: ({ code, asiento }) => this.joined(code, asiento),
        emparejados: (ice, round) => {
          if (this.rivalUid === null) this.status('Conectando con tu rival…');
          this.peer?.pair(ice, round);
        },
        senal: (data) => {
          if (this.closed) return;
          if (data?.t === 'sigo') {
            this.lastSigo = Date.now();
            this.rivalDecided(readVerdict(data.fin));
          } else if (data?.t === 'corte') this.rivalCut(readVerdict(data.fin));
          else this.peer?.receive(data);
        },
        rivalFuera: (forGood) => {
          if (forGood) this.rivalLeft();
          else if (this.rivalUid === null) this.status('Esperando a tu rival…');
        },
        error: (code) => {
          // con la conexión directa abierta, la sala ya no es imprescindible
          if (!this.peer?.healthy) this.end(code);
        },
      },
    });
  }

  /** Olvida los combates anteriores (partida nueva o rival nuevo). */
  reset() {
    this.session?.close();
    this.session = null;
    this.match = null;
    this.matchId = 0;
    this.proposal = null;
    this.them = null;
    this.isReady = false;
    this.wantsRematch = false;
    this.prepared = false;
    this.verdict = null;
    this.myFin = null;
    this.desynced = false;
    this.clearAway();
  }

  clearAway() {
    this.silentAt = null;
    this.awayAt = null;
  }

  /** Hay un combate en juego, sin resultado todavía. */
  get active() {
    return !!this.match && (this.phase === 'vs' || this.phase === 'fight') && !this.verdict;
  }

  create() {
    this.status('Creando sala…');
    this.signaling.create();
  }

  join(code) {
    this.status('Entrando en la sala…');
    this.signaling.join(code);
  }

  status(text) {
    if (!this.closed) this.on.status?.(text);
  }

  joined(code, side) {
    if (this.closed) return;
    this.on.code?.(code);
    this.side = side;
    if (this.peer) return;
    this.pick = this.pickFor?.(side) ?? 0;
    this.status(side === 0 ? 'Esperando a tu rival…' : 'Conectando con tu rival…');
    this.peer = new Peer({
      host: side === 0,
      signal: (data) => this.signaling.signal(data),
      on: {
        open: () => this.opened(),
        ctl: (msg) => this.control(msg),
        // una vez conectados, los cortes los gestiona update()
        down: () => this.rivalUid === null && this.end('directa'),
      },
    });
  }

  /** Conexión directa abierta (o rehecha: se repite lo que haya podido perderse). */
  opened() {
    if (this.closed) return;
    this.peer.sendCtl({ t: 'hola', v: PROTO, rosterHash: rosterHash(), uid: this.uid });
    if (this.rivalUid !== null) this.sendState();
    if (this.proposal) this.peer.sendCtl(this.proposal);
  }

  sendState() {
    this.peer?.sendCtl({
      t: 'yo',
      pick: this.pick,
      sel: this.phase === 'select' ? this.matchId : null,
      listo: this.phase === 'select' && this.isReady ? this.matchId + 1 : null,
      revancha: this.phase === 'result' && this.wantsRematch ? this.matchId : null,
      preparado: this.prepared ? this.matchId : null,
      ausente: this.hidden,
      fin: this.myFin,
    });
  }

  control(msg) {
    if (this.closed) return;
    if (msg.t === 'hola') return this.greet(msg);
    if (msg.t === 'adios') return this.rivalLeft();
    if (msg.t === 'corte') return this.rivalCut(readVerdict(msg.fin));
    if (this.rivalUid === null) return;
    if (msg.t === 'yo') {
      this.them = readState(msg);
      this.react();
    } else if (msg.t === 'empezar' && this.side === 1) {
      if (msg.to !== this.uid || msg.matchId !== this.matchId + 1 || this.active) return;
      if (!validSetup(msg)) return this.end('version');
      this.prepare(msg);
    }
  }

  greet(msg) {
    if (msg.v !== PROTO || msg.rosterHash !== rosterHash()) return this.end('version');
    if (msg.uid === this.rivalUid) return; // la misma persona, que ha reconectado
    const someoneElse = this.rivalUid !== null; // ha recargado la página o es otro
    if (someoneElse) this.reset();
    this.rivalUid = msg.uid;
    this.enterSelect();
  }

  /** Reacciona a un cambio propio o del rival. */
  react() {
    if (this.closed || !this.them) return;
    const them = this.them;
    if (this.rivalDecided(them.fin)) return;
    if (this.phase === 'result' && them.sel === this.matchId) return this.enterSelect();
    if (this.side === 0) {
      const selected = this.phase === 'select' && this.isReady && them.listo === this.matchId + 1;
      const again = this.phase === 'result' && this.wantsRematch && them.revancha === this.matchId;
      if (selected || again) return this.propose(again);
    }
    if (this.phase === 'vs') this.begin();
    this.on.change?.();
  }

  /**
   * El rival dice cómo acaba este combate (abandono o combates distintos). Del invitado solo se
   * acepta que se dé por perdido; si los dos han decidido cosas distintas, manda el anfitrión.
   * @returns true si cambia el resultado aquí
   */
  rivalDecided(fin) {
    if (this.closed || !this.match || fin?.n !== this.matchId) return false;
    if (this.side === 0 && !(fin.reason === 'abandono' && fin.winner === 0)) return false;
    if (this.active) {
      this.finish(fin);
      return true;
    }
    const mine = this.verdict;
    if (this.side !== 1 || this.phase !== 'result' || !mine) return false;
    if (mine.winner === fin.winner && mine.reason === fin.reason) return false;
    this.verdict = { winner: fin.winner, reason: fin.reason };
    this.on.screen?.('result');
    return true;
  }

  enterSelect() {
    this.phase = 'select';
    this.isReady = false;
    this.wantsRematch = false;
    this.prepared = false;
    this.verdict = null;
    this.clearAway();
    this.sendState();
    this.on.screen?.('select');
    this.react();
  }

  // ------------------------------------------------------------ acciones del jugador
  setPick(i) {
    if (this.closed || this.phase !== 'select' || this.isReady || !isPick(i)) return;
    this.pick = i;
    this.sendState();
    this.on.change?.();
  }

  toggleReady() {
    if (this.closed || this.phase !== 'select') return;
    this.isReady = !this.isReady;
    this.sendState();
    this.react();
  }

  rematch() {
    if (this.closed || this.phase !== 'result') return;
    this.wantsRematch = true;
    this.sendState();
    this.react();
  }

  /** Volver a elegir personaje (arrastra también al rival). */
  change() {
    if (this.closed || this.phase !== 'result') return;
    this.enterSelect();
  }

  /** La app pasa a segundo plano o vuelve. */
  setHidden(hidden) {
    if (this.closed || hidden === this.hidden) return;
    this.hidden = hidden;
    if (hidden) {
      this.hiddenAt = Date.now();
      return this.sendState();
    }
    this.signaling.ping();
    const away = Date.now() - this.hiddenAt;
    if (this.active && !this.match.result && away >= LOST_MS) return this.declare(1 - this.side, 'abandono');
    // lo que no haya llegado mientras tanto no cuenta contra el rival
    this.clearAway();
    if (this.peer && !this.peer.healthy) this.peer.restart();
    this.peer?.touch();
    this.sendState();
  }

  // ------------------------------------------------------------ combate
  /** El anfitrión decide el combate. */
  propose(again) {
    const picks = again ? this.proposal.picks : [this.pick, this.them.pick];
    // `to`: que un rival nuevo no empiece un combate propuesto al anterior
    this.proposal = { t: 'empezar', to: this.rivalUid, seed: randomSeed(), delay: delayFor(this.peer.rtt ?? 100), matchId: this.matchId + 1, picks };
    this.peer.sendCtl(this.proposal);
    this.prepare(this.proposal);
  }

  prepare({ seed, delay, matchId, picks }) {
    this.session?.close();
    this.session = null;
    this.delay = delay;
    this.matchId = matchId;
    this.pick = picks[this.side];
    this.phase = 'vs';
    this.isReady = false;
    this.wantsRematch = false;
    this.prepared = false;
    this.verdict = null;
    this.myFin = null;
    this.desynced = false;
    this.doneT = 0;
    this.clearAway();
    this.match = new Match({ ...this.matchOpts(), cfgs: picks.map((i) => ROSTER[i]), seed });
    this.sendState();
    this.on.screen?.('vs');
  }

  /** La presentación ha terminado en este dispositivo. */
  ready() {
    if (this.closed || this.phase !== 'vs') return;
    this.prepared = true;
    this.sendState();
    this.react();
  }

  begin() {
    if (!this.active || this.session || !this.prepared || this.them?.preparado !== this.matchId) return;
    this.phase = 'fight';
    this.match.startCountdown();
    this.session = new LockstepSession({
      match: this.match,
      localSide: this.side,
      delay: this.delay,
      matchId: this.matchId,
      transport: this.peer.transport,
      poll: (f, m) => this.controller.poll(f, m),
      onDesync: (frame) => {
        this.desynced = true;
        console.error(`Los dos combates difieren desde el fotograma ${frame}`);
      },
    });
  }

  finish(verdict) {
    if (this.closed || this.verdict) return;
    this.verdict = { winner: verdict.winner, reason: verdict.reason };
    // si el combate no ha terminado por sí solo, ya no hay que seguir sincronizando
    if (this.match.phase !== 'over') {
      this.session?.close();
      this.session = null;
    }
    this.phase = 'result';
    this.prepared = false;
    this.wantsRematch = false;
    this.clearAway();
    this.sendState();
    this.on.screen?.('result');
    this.react();
  }

  /** Este dispositivo decide el resultado y se lo comunica al otro. */
  declare(winner, reason) {
    this.myFin = { n: this.matchId, winner, reason };
    this.finish(this.myFin);
  }

  // ------------------------------------------------------------ paso del tiempo
  /** Llamar en cada fotograma de pantalla. dt en segundos. */
  update(dt) {
    if (this.closed) return;
    const s = this.session;
    // se recorta para que volver de otra app no dé un salto
    s?.update(Math.min(dt, 0.25));
    if (this.closed || this.rivalUid === null) return;
    this.watch(Date.now());
    if (this.closed || !this.active || !s) return;
    if (this.desynced) {
      // cada uno ve una pelea distinta: manda la del anfitrión
      if (this.side === 0 && (this.match.phase === 'over' || s.waiting > DESYNC_S)) {
        const [a, b] = this.match.fighters.map((f) => f.hp / f.maxHp);
        const { winner, reason } = this.match.result || { winner: a === b ? -1 : a > b ? 0 : 1, reason: 'time' };
        this.declare(winner, reason);
      }
    } else if (s.finished) {
      this.doneT += dt;
      if (this.doneT >= 1) this.finish(this.match.result);
    }
  }

  /** Vigila la conexión: la rehace y, pasado el plazo, decide quién se ha ido. */
  watch(now) {
    if (this.hidden) return;
    const silent = !this.peer.healthy || now - this.peer.lastRecv > SILENT_MS;
    if (!silent) this.silentAt = null;
    else {
      if (this.silentAt === null) {
        this.silentAt = this.retryAt = now;
        this.sigoAt = 0;
        this.signaling.ping(); // para saber cuanto antes si el corte es propio
      }
      if (now - this.sigoAt >= SIGO_MS) {
        this.sigoAt = now;
        this.signaling.signal({ t: 'sigo', fin: this.myFin });
      }
      // un rival fuera de la app puede callar con la conexión entera: no se rompe
      if (now - this.retryAt >= RETRY_MS && !(this.them?.ausente && this.peer.healthy)) {
        this.retryAt = now;
        this.peer.restart();
      }
    }

    // un combate ya decidido no se pierde por un corte
    if (!this.active || this.match.result) {
      this.awayAt = null;
      if (this.silentAt !== null && now - this.silentAt >= LOST_MS) this.end('perdida');
      return;
    }
    if (!silent && !this.them?.ausente) {
      this.awayAt = null;
      return;
    }
    this.awayAt ??= now;
    const waited = now - this.awayAt;
    if (waited < LOST_MS) return;
    const offline = silent && !this.signaling.online;
    // sin sala el corte es propio (o no se puede saber): aquí no se anota ganador; el que siga
    // conectado ganará al dejar de oír «sigo»
    if (offline) this.end('perdida');
    else if (waited >= LOST_MS + GRACE_MS) {
      // los dos llegan a la sala pero no entre sí: no gana nadie
      if (silent && now - this.lastSigo < SIGO_FRESH_MS) this.end('perdida');
      else this.declare(this.side, 'abandono');
    }
  }

  /** Lo que se ve en la selección: personaje y «listo» de cada lado. */
  get selection() {
    const picks = [];
    const ready = [];
    picks[this.side] = this.pick;
    ready[this.side] = this.isReady;
    picks[1 - this.side] = this.them?.pick;
    ready[1 - this.side] = this.them?.listo === this.matchId + 1;
    return { picks, ready };
  }

  get rivalWantsRematch() {
    return this.phase === 'result' && this.them?.revancha === this.matchId;
  }

  /** Aviso para la pantalla actual, o ''. */
  get notice() {
    if (this.closed) return this.rivalGone ? ERRORS[this.goneReason] || '' : '';
    if (this.rivalUid === null) return '';
    if (this.active && !this.match.result) {
      if (this.awayAt !== null) {
        const left = Math.max(0, Math.ceil((LOST_MS - (Date.now() - this.awayAt)) / 1000));
        const who = this.silentAt !== null && !this.signaling.online ? 'Sin conexión' : 'Esperando a tu rival';
        return `${who}… ${left}`;
      }
      if (this.desynced) return 'Los dos combates no coinciden';
      return this.session?.waiting > SLOW_S ? 'Conexión lenta…' : '';
    }
    if (this.silentAt !== null) return 'Reconectando…';
    return this.them?.ausente ? 'Tu rival está fuera de la app' : '';
  }

  get debug() {
    const s = this.session;
    if (!s) return '';
    const sync = s.desync ? `DESINCRONIZADO en ${s.desync.frame}` : 'sincronizado';
    return `ida y vuelta ${Math.round(this.peer.rtt ?? 0)} ms · retraso ${s.delay} · fotograma ${this.match.frame} · esperas ${s.stalls} · ${sync}`;
  }

  // ------------------------------------------------------------ final
  /** El rival ha salido a propósito. */
  rivalLeft() {
    if (this.closed) return;
    if (this.rivalUid === null) {
      this.peer?.drop(); // aún no había partida: la sala sigue abierta para otro
      return this.status('Esperando a tu rival…');
    }
    if (this.active) {
      // puede que su combate hubiera terminado y aquí falten por simular los últimos fotogramas
      for (let i = 0; i < 20 && this.session && this.match.phase !== 'over'; i++) this.session.update(0.1);
      this.finish(this.match.result ?? { winner: this.side, reason: 'abandono' });
    }
    this.end('adios');
  }

  /** El rival cierra por un fallo de conexión: no cuenta como abandono. */
  rivalCut(fin) {
    if (this.closed || this.rivalUid === null) return;
    this.rivalDecided(fin);
    this.end('perdida');
  }

  /** Se acabó la partida por un error o porque no queda con quién jugar. */
  end(code) {
    if (this.closed) return;
    // el combate decidido se muestra aunque ya no haya conexión
    if (this.active && this.match.result) this.finish(this.match.result);
    const showing = this.phase === 'result';
    this.rivalGone = showing;
    this.goneReason = code;
    this.leave(false);
    if (showing) this.on.change?.();
    else this.on.end?.(code);
  }

  /** @param voluntary false si se cierra por un fallo: el rival no debe contarlo como abandono */
  leave(voluntary = true) {
    if (this.closed) return;
    this.closed = true;
    if (voluntary) this.peer?.sendCtl({ t: 'adios' });
    else {
      const fin = this.verdict ? { n: this.matchId, ...this.verdict } : null;
      this.peer?.sendCtl({ t: 'corte', fin });
      this.signaling.signal({ t: 'corte', fin }); // antes de salir: la sala respeta el orden
    }
    this.session?.close();
    this.signaling.leave();
    // un instante para que salga la despedida
    const peer = this.peer;
    if (peer) setTimeout(() => peer.close(), 200);
  }
}
