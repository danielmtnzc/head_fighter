// Prueba del lockstep sin red real: node tools/red-sim.mjs
// Dos sesiones unidas por una red de mentira deben simular exactamente el mismo combate.
import { Match } from '../src/engine/match.js';
import { ROSTER } from '../src/characters/roster.js';
import { createRng } from '../src/net/rng.js';
import { hashState } from '../src/net/checksum.js';
import { LockstepSession, delayFor } from '../src/net/lockstep.js';
import { createFakeLink } from './fakeNet.js';

const CASES = [
  { name: 'red perfecta', latency: 0, jitter: 0, loss: 0, hz: [60, 60] },
  { name: 'wifi', latency: 20, jitter: 5, loss: 0.01, hz: [60, 60] },
  { name: 'datos móviles', latency: 80, jitter: 30, loss: 0.2, hz: [60, 60] },
  { name: 'muy mala', latency: 120, jitter: 80, loss: 0.5, hz: [60, 60] },
  { name: 'pantallas de 120 y 30 Hz', latency: 50, jitter: 20, loss: 0.05, hz: [120, 30] },
  { name: 'retraso mínimo', latency: 100, jitter: 20, loss: 0.1, hz: [60, 60], delay: 2 },
  { name: 'duplicados y ArrayBuffer', latency: 60, jitter: 40, loss: 0.1, dup: 0.3, arrayBuffer: true, hz: [60, 60] },
  { name: 'cortes de 3 s', latency: 40, jitter: 10, loss: 0.02, hz: [60, 60], outage: { every: 20000, length: 3000 } },
  { name: 'relojes desiguales', latency: 50, jitter: 20, loss: 0.05, hz: [59.94, 60.5], wobble: 0.3 },
];

function play(c, index, { corruptAt = 0, matchId = 0, stale = [] } = {}) {
  const random = createRng(500 + index);
  const link = createFakeLink({ ...c, random: () => random.next() });
  const delay = c.delay ?? delayFor(c.latency * 2);
  const cfgs = [ROSTER[(index * 3) % ROSTER.length], ROSTER[(index * 5 + 1) % ROSTER.length]];
  const sent = []; // copia de lo que envía el primer extremo
  const send = link.a.send;
  link.a.send = (data) => {
    sent.push(data.slice());
    send(data);
  };

  const peers = [0, 1].map((side) => {
    const match = new Match({ cfgs, stage: {}, silent: true, seed: 42 + index });
    match.startCountdown();
    const rng = createRng(side + 10 * index);
    const peer = { match, hashes: [], desync: null, clock: 0, next: 1000 / c.hz[side] };
    peer.session = new LockstepSession({
      match,
      localSide: side,
      delay,
      matchId,
      transport: side ? link.b : link.a,
      poll: (f, m) => ({
        x: rng.next() < 0.7 ? Math.sign(m.opponentOf(f).x - f.x) : rng.range(-1, 1),
        jump: rng.next() < 0.015,
        punch: rng.next() < 0.05,
        kick: rng.next() < 0.04,
        special: rng.next() < 0.03,
      }),
      onTick: (m) => {
        if (m.frame === corruptAt && side) m.fighters[0].x += 1; // desincronización a propósito
        peer.hashes[m.frame] = hashState(m);
      },
      onDesync: (frame) => (peer.desync = frame),
    });
    return peer;
  });

  // reloj común de 1 ms; cada extremo refresca la pantalla a su ritmo y, como hará el juego,
  // deja de actualizar un segundo después de haber terminado
  let ms = 0;
  while (peers.some((p) => !p.stopped) && ms < 600000) {
    if (c.outage) link.opts.loss = ms % c.outage.every > c.outage.every - c.outage.length ? 1 : c.loss;
    link.advance(1);
    ms++;
    // paquetes rezagados del combate anterior
    if (stale.length && ms % 7 === 0) {
      const old = stale[(ms / 7) % stale.length];
      peers.forEach((p) => p.session.receive(old));
    }
    peers.forEach((p, i) => {
      if (p.stopped || ms < p.next) return;
      p.session.update((ms - p.clock) / 1000);
      p.clock = ms;
      p.next += (1000 / c.hz[i]) * (1 + (random.next() * 2 - 1) * (c.wobble || 0));
      if (p.session.finished) p.doneAt ??= ms;
      if (p.doneAt !== undefined && ms - p.doneAt > 1000) p.stopped = true;
    });
  }
  return { peers, ms, delay, sent };
}

let failed = false;
const fail = (text) => {
  failed = true;
  console.error(`FALLO: ${text}`);
};

function check(c, { peers, ms, delay }) {
  const [a, b] = peers;
  const common = Math.min(a.hashes.length, b.hashes.length);
  for (let f = 1; f < common; f++) {
    if (a.hashes[f] !== b.hashes[f]) return fail(`${c.name}: difieren en el fotograma ${f}`);
  }
  if (peers.some((p) => !p.stopped || p.match.phase !== 'over')) return fail(`${c.name}: el combate no acaba en los dos`);
  if (a.match.frame !== b.match.frame) return fail(`${c.name}: acaban en fotogramas distintos`);
  if (a.desync !== null || b.desync !== null) return fail(`${c.name}: aviso de desincronización`);
  const frames = a.match.frame;
  const slow = ((((ms - 1000) / 1000) / (frames / 60) - 1) * 100).toFixed(0);
  console.log(`${c.name}: ${frames} fotogramas iguales, retraso ${delay}, ${slow} % más lento que en tiempo real`);
}

CASES.forEach((c, i) => check(c, play(c, i)));

// revancha con paquetes del combate anterior llegando tarde
const old = play(CASES[1], 2, { matchId: 1 }).sent.slice(-200);
const rematch = { ...CASES[1], name: 'revancha con paquetes viejos' };
check(rematch, play(rematch, 2, { matchId: 2, stale: old }));

// paquetes mal formados o con fotogramas imposibles
{
  const session = new LockstepSession({
    match: new Match({ cfgs: [ROSTER[0], ROSTER[1]], stage: {}, silent: true }),
    localSide: 0,
    delay: 3,
    transport: { send() {} },
    poll: () => ({}),
  });
  const wrongLength = new Uint8Array(25);
  wrongLength[0] = 1;
  if (session.receive(new Uint8Array(3)) || session.receive(wrongLength)) fail('acepta paquetes mal formados');
  const huge = new Uint8Array(21); // un mando para el fotograma 4.000.000.000
  const v = new DataView(huge.buffer);
  v.setUint8(0, 1);
  v.setUint32(6, 4e9);
  v.setUint8(10, 1);
  if (!session.receive(huge) || session.remote.size !== 3) fail('guarda mandos de fotogramas imposibles');
}

// la suma de comprobación tiene que avisar si algo se tuerce
const broken = play(CASES[1], 1, { corruptAt: 200 }).peers;
if (broken.every((p) => p.desync === null)) fail('no se detecta una desincronización provocada');
else console.log(`desincronización provocada en el fotograma 200: detectada en el ${broken.find((p) => p.desync !== null).desync}`);

if (failed) process.exit(1);
console.log('OK');
