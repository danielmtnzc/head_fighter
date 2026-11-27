// Conexión WebRTC directa con el rival, negociada a través de la sala. Dos canales:
//  - ctl: mensajes JSON, fiable y ordenado
//  - inp: binario, sin orden ni reenvíos (mandos del lockstep y pings)
// El anfitrión hace la oferta. Con cada emparejamiento nuevo de la sala se negocia de cero,
// salvo que la conexión actual siga sana: un corte de la señalización no corta la partida.
// Si la conexión deja de responder, restart() la rehace entera (el lockstep reenvía lo perdido).
//
// Señales: pide{ronda} (invitado sin conexión) · oferta{ronda, n, sdp} · respuesta{ronda, n, sdp}
//          ice{ronda, n, candidate}        ronda: emparejamiento; n: intento del anfitrión

const TYPE_PING = 2;
const PING_MS = 500;
const CONNECT_MS = 15_000; // plazo de la primera conexión
const RECONNECT_MS = 10_000; // plazo de cada intento posterior
const MAX_BUFFERED = 8 * 1024; // si se acumula más, se deja de enviar mandos (se repiten luego)
const MAX_CANDIDATES = 50;
const MAX_RTT = 5000;

export class Peer {
  /**
   * @param host    true en el que creó la sala
   * @param signal  (data) → envía una señal al rival por la sala
   * @param on      { open(), ctl(msg), down() }  down: no se pudo conectar o se ha cortado
   */
  constructor({ host, signal, on = {} }) {
    this.host = host;
    this.signal = signal;
    this.on = on;
    this.pc = null;
    this.ice = [];
    this.round = 0;
    this.attempt = 0; // último intento de conexión (lo numera el anfitrión)
    this.connected = false; // alguna vez ha llegado a abrirse
    this.lastRecv = 0; // cuándo llegó lo último del rival (Date.now)
    this.rtt = null; // ida y vuelta en ms, suavizado
    this.opened = false;
    this.closed = false;
    this.queue = Promise.resolve();
    // transporte del lockstep: cada combate le pone su onMessage
    this.transport = { onMessage: null, send: (data) => this.sendInput(data) };
  }

  get healthy() {
    return this.opened && this.pc?.connectionState === 'connected';
  }

  /** La sala ha emparejado a los dos. */
  pair(ice, round) {
    this.run(async () => {
      if (round <= this.round) return;
      this.round = round;
      this.ice = ice;
      if (this.healthy) return;
      if (this.host) await this.offer();
      else this.signal({ t: 'pide', ronda: round });
    });
  }

  /** La conexión no responde: se rehace de cero. */
  restart() {
    this.run(async () => {
      if (!this.round) return;
      if (this.host) await this.offerIfIdle();
      else this.signal({ t: 'pide', ronda: this.round });
    });
  }

  /** No se corta un intento en marcha: con datos móviles puede tardar varios segundos. */
  async offerIfIdle() {
    if (!this.pc || this.opened) await this.offer();
  }

  /** Da por recibido algo ahora (al volver a la app). */
  touch() {
    this.lastRecv = Date.now();
  }

  /** Señal del rival. */
  receive(data) {
    this.run(async () => {
      if (data?.t === 'pide') {
        // el invitado no tiene conexión aunque aquí parezca que sí (ha recargado la página)
        if (this.host && data.ronda === this.round) await this.offerIfIdle();
      } else if (data?.t === 'oferta' && !this.host) {
        if (!(data.ronda > this.round || (data.ronda === this.round && data.n > this.attempt))) return;
        this.round = data.ronda;
        this.attempt = data.n;
        const pc = this.create();
        await pc.setRemoteDescription(data.sdp);
        await pc.setLocalDescription(await pc.createAnswer());
        this.signal({ t: 'respuesta', ronda: data.ronda, n: data.n, sdp: pc.localDescription.toJSON() });
        await this.addCandidates();
      } else if (data?.t === 'respuesta' && this.host) {
        if (data.n !== this.attempt || this.pc?.signalingState !== 'have-local-offer') return;
        await this.pc.setRemoteDescription(data.sdp);
        await this.addCandidates();
      } else if (data?.t === 'ice') {
        // pueden llegar antes que la descripción: se guardan
        this.pending = [...(this.pending || []), data].slice(-MAX_CANDIDATES);
        await this.addCandidates();
      }
    });
  }

  /** Las señales se procesan de una en una. */
  run(task) {
    this.queue = this.queue.then(() => !this.closed && task()).catch((e) => console.warn('WebRTC:', e));
  }

  async addCandidates() {
    if (!this.pc?.remoteDescription) return;
    const mine = (this.pending || []).filter((d) => d.n === this.attempt);
    this.pending = (this.pending || []).filter((d) => d.n > this.attempt);
    for (const d of mine) await this.pc.addIceCandidate(d.candidate).catch((e) => console.warn('ICE:', e));
  }

  async offer() {
    this.attempt++;
    const { round: ronda, attempt: n } = this;
    const pc = this.create();
    await pc.setLocalDescription(await pc.createOffer());
    this.signal({ t: 'oferta', ronda, n, sdp: pc.localDescription.toJSON() });
  }

  create() {
    this.drop();
    // antes de nada: si algo falla al crearla, también se avisa
    this.timeout = setTimeout(() => this.fail(), this.connected ? RECONNECT_MS : CONNECT_MS);
    const pc = new RTCPeerConnection({ iceServers: this.ice });
    this.pc = pc;
    const { round: ronda, attempt: n } = this;
    pc.onicecandidate = (e) => e.candidate && pc === this.pc && this.signal({ t: 'ice', ronda, n, candidate: e.candidate.toJSON() });
    pc.onconnectionstatechange = () => pc === this.pc && pc.connectionState === 'failed' && this.fail();
    this.ctlChannel = pc.createDataChannel('ctl', { negotiated: true, id: 0 });
    this.inpChannel = pc.createDataChannel('inp', { negotiated: true, id: 1, ordered: false, maxRetransmits: 0 });
    this.inpChannel.binaryType = 'arraybuffer';
    let open = 0;
    for (const ch of [this.ctlChannel, this.inpChannel]) {
      ch.onopen = () => {
        if (pc !== this.pc || ++open < 2) return;
        clearTimeout(this.timeout);
        this.opened = this.connected = true;
        this.touch();
        this.pinger = setInterval(() => this.ping(), PING_MS);
        this.ping();
        this.on.open?.();
      };
      ch.onclose = () => pc === this.pc && this.fail();
    }
    this.ctlChannel.onmessage = (e) => {
      if (pc !== this.pc) return;
      let msg;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      if (!msg || typeof msg !== 'object') return;
      this.touch();
      this.on.ctl?.(msg);
    };
    this.inpChannel.onmessage = (e) => pc === this.pc && this.input(e.data);
    return pc;
  }

  input(data) {
    if (!(data instanceof ArrayBuffer) || !data.byteLength) return;
    this.touch();
    const v = new DataView(data);
    if (v.byteLength === 10 && v.getUint8(0) === TYPE_PING) {
      if (v.getUint8(1) === 0) {
        v.setUint8(1, 1); // se devuelve tal cual
        this.sendInput(new Uint8Array(data));
      } else {
        const ms = performance.now() - v.getFloat64(2);
        if (!(ms >= 0 && ms < MAX_RTT)) return; // respuesta manipulada o rezagadísima
        this.rtt = this.rtt === null ? ms : this.rtt * 0.7 + ms * 0.3;
      }
    } else this.transport.onMessage?.(data);
  }

  ping() {
    const data = new Uint8Array(10);
    const v = new DataView(data.buffer);
    v.setUint8(0, TYPE_PING);
    v.setFloat64(2, performance.now());
    this.sendInput(data);
  }

  sendInput(data) {
    const ch = this.inpChannel;
    if (ch?.readyState === 'open' && ch.bufferedAmount < MAX_BUFFERED) ch.send(data);
  }

  sendCtl(msg) {
    if (this.ctlChannel?.readyState === 'open') this.ctlChannel.send(JSON.stringify(msg));
  }

  fail() {
    if (this.closed) return;
    this.drop();
    this.on.down?.();
  }

  /** Cierra la conexión actual (sin avisar). */
  drop() {
    clearTimeout(this.timeout);
    clearInterval(this.pinger);
    const pc = this.pc;
    this.pc = null;
    this.ctlChannel = this.inpChannel = null;
    this.opened = false;
    this.rtt = null;
    pc?.close();
  }

  close() {
    this.closed = true;
    this.drop();
  }
}
