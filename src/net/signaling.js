// Cliente de las salas (worker/src/index.js). Mantiene el WebSocket abierto, comprueba con
// pings que sigue vivo y, si se corta, vuelve al mismo asiento con el token.
// La señalización va aparte de la conexión WebRTC: que aquí haya un corte (reconectando,
// rivalFuera) no significa que la partida se haya cortado.
import { PROTO, WORKER_URL } from './config.js';

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // sin I ni O, que se confunden con 1 y 0
// algo menos de lo que la sala guarda el asiento (mucho más mientras no ha habido rival)
const GIVE_UP_MS = 50_000;
const GIVE_UP_ALONE_MS = 290_000;

export const randomCode = () => Array.from(crypto.getRandomValues(new Uint32Array(4)), (n) => LETTERS[n % LETTERS.length]).join('');

/** Código escrito a mano → código válido, o null. */
export function parseCode(text) {
  const code = String(text).trim().toUpperCase();
  return /^[A-HJ-NP-Z]{4}$/.test(code) ? code : null;
}

export class Signaling {
  /**
   * @param on  { sala({code, asiento}), emparejados(ice, ronda), senal(data),
   *              rivalFuera(definitivo), reconectando(), error(code) }
   *            Tras error() la sesión queda cerrada. Códigos: llena, no-existe, version,
   *            origen, caducada, abuso, conexion
   */
  constructor({ on = {}, url = WORKER_URL, pingMs = 8000, pongMs = 10_000 } = {}) {
    this.on = on;
    this.url = url;
    this.pingMs = pingMs;
    this.pongMs = pongMs;
    this.token = null;
    this.joined = false; // dentro de la sala por la conexión actual
    this.closed = false;
    this.retries = 0;
    this.lostAt = null;
    // al volver a la app o recuperar la red se comprueba la conexión sin esperar al siguiente ping
    this.wake = () => this.ping();
    globalThis.addEventListener?.('online', this.wake);
    globalThis.document?.addEventListener('visibilitychange', this.wake);
  }

  /** Crea una sala con un código libre. */
  create() {
    this.role = 'crear';
    this.code = randomCode();
    this.open();
  }

  join(code) {
    this.role = 'unirse';
    this.code = code;
    this.open();
  }

  /** true si ahora mismo se llega al servidor de salas. */
  get online() {
    return this.joined && this.ws?.readyState === WebSocket.OPEN;
  }

  /** Mensaje para el rival (oferta, respuesta o candidato). Se pierde si él no está. */
  signal(data) {
    return this.write({ t: 'senal', data });
  }

  /** Abandona la sala y libera el asiento. */
  leave() {
    this.write({ t: 'adios' });
    this.close();
  }

  close() {
    this.closed = true;
    this.stopTimers();
    globalThis.removeEventListener?.('online', this.wake);
    globalThis.document?.removeEventListener('visibilitychange', this.wake);
    this.ws?.close();
  }

  write(msg) {
    if (this.ws?.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify(msg));
    return true;
  }

  open() {
    if (!this.url) return this.fail('conexion');
    const ws = new WebSocket(`${this.url}/sala/${this.code}`);
    this.ws = ws;
    ws.onopen = () => {
      this.write({ t: 'hola', v: PROTO, rol: this.role, token: this.token || undefined });
      this.pinger = setInterval(() => this.ping(), this.pingMs);
    };
    ws.onmessage = (e) => ws === this.ws && this.receive(e.data);
    ws.onclose = () => ws === this.ws && this.lost();
    // si ni siquiera llega a abrirse, no se espera al sistema (en móvil puede tardar minutos)
    this.watchdog = setTimeout(() => this.drop(), this.pongMs);
  }

  /** Manda un ping; si no llega nada a tiempo, la conexión está muerta aunque parezca abierta. */
  ping() {
    if (this.closed || this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send('ping');
    this.watchdog ??= setTimeout(() => this.drop(), this.pongMs);
  }

  drop() {
    const old = this.ws;
    this.ws = null; // su onclose puede tardar: ya no cuenta
    old?.close();
    this.lost();
  }

  alive() {
    clearTimeout(this.watchdog);
    this.watchdog = null;
  }

  receive(raw) {
    if (this.closed) return;
    this.alive();
    if (raw === 'pong') return;
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (msg.t === 'sala') {
      this.token = msg.token;
      this.joined = true;
      this.retries = 0;
      this.lostAt = null;
      this.on.sala?.({ code: msg.code, asiento: msg.asiento });
    } else if (msg.t === 'emparejados') {
      this.paired = true;
      this.on.emparejados?.(msg.ice, msg.ronda);
    }
    else if (msg.t === 'senal') this.on.senal?.(msg.data);
    else if (msg.t === 'rival-fuera') this.on.rivalFuera?.(msg.definitivo);
    else if (msg.t === 'error') {
      // el código elegido ya estaba cogido: se prueba con otro
      if (msg.code === 'ocupada' && !this.token && this.retries++ < 5) {
        const old = this.ws;
        this.stopTimers();
        this.create();
        old.close();
      } else this.fail(msg.code);
    }
  }

  lost() {
    this.joined = false;
    this.stopTimers();
    if (this.closed) return;
    if (!this.token) return this.fail('conexion');
    this.lostAt ??= Date.now();
    if (Date.now() - this.lostAt > (this.paired ? GIVE_UP_MS : GIVE_UP_ALONE_MS)) return this.fail('conexion');
    this.on.reconectando?.();
    const wait = Math.min(500 * 2 ** this.retries++, 5000);
    this.retry = setTimeout(() => this.open(), wait);
  }

  stopTimers() {
    this.alive();
    clearInterval(this.pinger);
    clearTimeout(this.retry);
  }

  fail(code) {
    if (this.closed) return;
    this.close();
    this.on.error?.(code);
  }
}
