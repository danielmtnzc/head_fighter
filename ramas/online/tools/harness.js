// Combates automáticos para comprobar el determinismo. Lo usan sim.mjs (node) y
// determinismo.html (navegador): con las mismas semillas deben dar el mismo hash en cualquier
// dispositivo.
import { Match } from '../src/engine/match.js';
import { ROSTER } from '../src/characters/roster.js';
import { createRng } from '../src/net/rng.js';
import { hashState, mix, HASH_START } from '../src/net/checksum.js';

const MAX_TICKS = 60 * 150;

/** Todos los cruces posibles, incluidos los de un personaje contra sí mismo. */
export const PAIRS = ROSTER.flatMap((a) => ROSTER.map((b) => [a, b]));

/** Mandos inventados: tienden a acercarse al rival para que haya golpes. */
function makeInput(rng, held, match, side) {
  const [me, other] = [match.fighters[side], match.fighters[1 - side]];
  if (rng.next() < 0.06) {
    const r = rng.next();
    const toward = other.x > me.x ? 1 : -1;
    held.x = r < 0.6 ? toward : r < 0.75 ? -toward : r < 0.85 ? 0 : Math.round(rng.range(-127, 127)) / 127;
  }
  return {
    x: held.x,
    jump: rng.next() < 0.015,
    punch: rng.next() < 0.05,
    kick: rng.next() < 0.04,
    special: rng.next() < 0.03,
  };
}

/**
 * Juega un cruce. Con `twin` avanza a la vez dos combates con los mismos mandos y compara su
 * estado en cada tick (el segundo tiene además otra pantalla, que no debe influir).
 * @returns { hash, ticks, diff, specials }  diff = primer tick distinto, o null
 */
export function runBattle(index, { twin = false } = {}) {
  const cfgs = PAIRS[index];
  const create = () => new Match({ cfgs, stage: {}, silent: true, seed: 1000 + index });
  const matches = twin ? [create(), create()] : [create()];
  if (twin) matches[1].view = { w: 700, h: 540, scale: 1, groundY: 430 };
  matches.forEach((m) => m.startCountdown());

  const rng = createRng(7777 + index);
  const held = [{ x: 0 }, { x: 0 }];
  const specials = new Set();
  const [main, other] = matches;
  let hash = HASH_START;
  let ticks = 0;

  while (main.phase !== 'over' && ticks < MAX_TICKS) {
    // energía llena cada 3 s para que salgan muchos especiales
    if (ticks % 180 === 0) for (const m of matches) for (const f of m.fighters) f.energy = 100;
    const inputs = [makeInput(rng, held[0], main, 0), makeInput(rng, held[1], main, 1)];
    for (const m of matches) m.tick(inputs);
    for (const f of main.fighters) if (f.action?.kind === 'special') specials.add(f.cfg.special.type);
    const h = hashState(main);
    if (other && hashState(other) !== h) return { hash, ticks, diff: ticks, specials };
    hash = mix(hash, h);
    ticks++;
  }
  return { hash, ticks, diff: null, specials };
}

export const hex = (h) => h.toString(16).padStart(8, '0');
export const names = (index) => PAIRS[index].map((c) => c.name).join(' vs ');
