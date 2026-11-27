// Lockstep con retraso fijo: los dos dispositivos simulan el mismo combate y solo se envían los
// mandos. El mando leído en el fotograma F se aplica en F + delay; un fotograma no avanza hasta
// tener los mandos de los dos.
//
// Paquete (binario): [u8 tipo][u8 partida][u32 ack][u32 primerFrame][u8 n][n × u16 mando][u32 frame][u32 hash]
//  - partida: identificador del combate; descarta paquetes rezagados de uno anterior
//  - ack: primer fotograma del rival que aún falta
//  - se repiten todos los mandos sin confirmar, así que perder paquetes no rompe nada
//  - frame/hash: última suma de comprobación propia (frame 0 = todavía ninguna)
//
// Cada combate (revancha incluida) usa una sesión nueva. Hay que seguir llamando a update()
// hasta que `finished` sea cierto y un segundo más, para que el rival reciba lo que le falte.
import { STEP } from '../config.js';
import { encodeInput, decodeInput, NEUTRAL_CODE } from './inputCodec.js';
import { hashState } from './checksum.js';

const TYPE_INPUT = 1;
const HEADER = 11;
const FOOTER = 8;
const MAX_INPUTS = 64;
const MAX_TICKS = 4; // por llamada a update, para alcanzar al rival sin dar saltos
const DEBT_FORGIVE = 0.1; // parte del tiempo de cada espera que ya no se recupera
const KEEP_HASHES = 20;
export const HASH_EVERY = 30;

/** Fotogramas de retraso adecuados para un ida y vuelta medido en milisegundos. */
export const delayFor = (rttMs) => Math.min(7, Math.max(3, Math.ceil(rttMs / 2 / (STEP * 1000)) + 1));

export class LockstepSession {
  /**
   * @param match      combate con la misma semilla que el del rival, ya en cuenta atrás
   * @param localSide  0 o 1: el luchador que se maneja en este dispositivo
   * @param delay      fotogramas de retraso (igual en los dos)
   * @param matchId    0-255, igual en los dos y distinto del combate anterior
   * @param transport  { send(Uint8Array), onMessage(Uint8Array | ArrayBuffer) } sin orden ni garantías
   * @param poll       (fighter, match) → mandos locales; se llama una vez por tick
   * @param onTick     (match) tras cada tick
   * @param onDesync   (frame, hashPropio, hashRival) la primera vez que no coinciden
   */
  constructor({ match, localSide, delay, matchId = 0, transport, poll, onTick, onDesync }) {
    this.match = match;
    this.side = localSide;
    this.delay = delay;
    this.matchId = matchId & 0xff;
    this.transport = transport;
    this.poll = poll;
    this.onTick = onTick;
    this.onDesync = onDesync;
    this.acc = 0;
    this.sendT = 0;
    this.waiting = 0; // segundos seguidos sin poder avanzar
    this.sinceRecv = 0; // segundos sin recibir un paquete válido
    this.stalls = 0; // actualizaciones en las que hubo que esperar
    this.desync = null;
    this.closed = false;
    this.local = new Map();
    this.remote = new Map();
    for (let f = 0; f < delay; f++) {
      this.local.set(f, NEUTRAL_CODE);
      this.remote.set(f, NEUTRAL_CODE);
    }
    this.localNext = delay; // siguiente fotograma propio sin mando
    this.remoteNext = delay; // primer fotograma del rival que falta
    this.peerAck = delay; // lo que el rival ya tiene de nosotros
    this.hashes = new Map(); // últimos propios
    this.peerHashes = new Map(); // últimos del rival
    this.lastHash = [0, 0];
    this.listener = (data) => this.receive(data);
    transport.onMessage = this.listener;
  }

  /** Combate acabado y el rival ya tiene todos los mandos que necesita para acabarlo. */
  get finished() {
    return this.match.phase === 'over' && this.peerAck >= this.match.frame;
  }

  close() {
    this.closed = true;
    if (this.transport.onMessage === this.listener) this.transport.onMessage = null;
    for (const m of [this.local, this.remote, this.hashes, this.peerHashes]) m.clear();
  }

  /** Llamar en cada fotograma de pantalla. realDt en segundos. */
  update(realDt) {
    if (this.closed) return;
    const dt = Math.min(realDt, 0.1);
    this.sinceRecv += realDt;
    this.acc = Math.min(this.acc + dt, MAX_TICKS * STEP);
    let ran = false;
    // en 'over' no se avanza más: el rival puede haber dejado de mandar mandos
    while (this.match.phase !== 'over' && this.acc >= STEP && this.remote.has(this.match.frame)) {
      this.acc -= STEP;
      this.runTick();
      this.waiting = 0;
      ran = true;
    }
    if (this.match.phase === 'over') this.acc = 0;
    // el tiempo sin gastar se conserva (hasta MAX_TICKS) para alcanzar al rival al llegar sus mandos
    else if (this.acc >= STEP) {
      this.waiting += dt;
      this.stalls++;
      // quien espera va por delante: renuncia poco a poco a lo atrasado. Si lo guardara entero,
      // tras un parón del rival iría para siempre al límite, a tirones
      this.acc -= dt * DEBT_FORGIVE;
    }
    // se envía también mientras se espera: si no, una pérdida bloquearía a los dos
    this.sendT += dt;
    if (ran || this.sendT >= STEP) {
      this.sendT = 0;
      this.send();
    }
  }

  runTick() {
    const frame = this.match.frame;
    // un mando nuevo por tick, para dentro de `delay` fotogramas
    const mine = this.poll(this.match.fighters[this.side], this.match);
    this.local.set(this.localNext++, encodeInput(mine));

    const inputs = [];
    inputs[this.side] = decodeInput(this.local.get(frame));
    inputs[1 - this.side] = decodeInput(this.remote.get(frame));
    this.match.tick(inputs);
    this.remote.delete(frame);
    // los propios se guardan hasta que el rival los confirme
    for (const f of this.local.keys()) {
      if (f >= this.peerAck || f >= this.match.frame) break;
      this.local.delete(f);
    }

    // también en el último tick, para comprobar el resultado
    if (this.match.frame % HASH_EVERY === 0 || this.match.phase === 'over') {
      const h = hashState(this.match);
      this.lastHash = [this.match.frame, h];
      this.remember(this.hashes, this.match.frame, h);
      this.compare(this.match.frame);
    }
    this.onTick?.(this.match);
  }

  send() {
    const first = this.peerAck;
    const n = Math.max(0, Math.min(MAX_INPUTS, this.localNext - first));
    const buf = new Uint8Array(HEADER + n * 2 + FOOTER);
    const v = new DataView(buf.buffer);
    v.setUint8(0, TYPE_INPUT);
    v.setUint8(1, this.matchId);
    v.setUint32(2, this.remoteNext);
    v.setUint32(6, first);
    v.setUint8(10, n);
    for (let i = 0; i < n; i++) v.setUint16(HEADER + i * 2, this.local.get(first + i));
    v.setUint32(HEADER + n * 2, this.lastHash[0]);
    v.setUint32(HEADER + n * 2 + 4, this.lastHash[1]);
    this.transport.send(buf);
  }

  /** Devuelve false si el paquete no es de esta sesión o está mal formado. */
  receive(data) {
    const u8 = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
    const v = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    if (this.closed || v.byteLength < HEADER + FOOTER || v.getUint8(0) !== TYPE_INPUT) return false;
    const n = v.getUint8(10);
    if (v.getUint8(1) !== this.matchId || v.byteLength !== HEADER + n * 2 + FOOTER) return false;
    this.sinceRecv = 0;
    // los paquetes pueden llegar desordenados: el ack nunca retrocede
    this.peerAck = Math.max(this.peerAck, Math.min(v.getUint32(2), this.localNext));

    const first = v.getUint32(6);
    const limit = this.match.frame + 2 * this.delay + MAX_INPUTS; // el rival no puede ir más allá
    for (let i = 0; i < n; i++) {
      const f = first + i;
      if (f >= this.remoteNext && f <= limit) this.remote.set(f, v.getUint16(HEADER + i * 2));
    }
    while (this.remote.has(this.remoteNext)) this.remoteNext++;

    const frame = v.getUint32(HEADER + n * 2);
    if (frame) {
      this.remember(this.peerHashes, frame, v.getUint32(HEADER + n * 2 + 4));
      this.compare(frame);
    }
    return true;
  }

  remember(map, frame, hash) {
    map.set(frame, hash);
    if (map.size > KEEP_HASHES) map.delete(map.keys().next().value);
  }

  compare(frame) {
    if (this.desync || !this.hashes.has(frame) || !this.peerHashes.has(frame)) return;
    const mine = this.hashes.get(frame);
    const theirs = this.peerHashes.get(frame);
    if (mine !== theirs) {
      this.desync = { frame, mine, theirs };
      this.onDesync?.(frame, mine, theirs);
    }
  }
}
