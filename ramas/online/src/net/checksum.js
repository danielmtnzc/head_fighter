// Suma de comprobación (FNV-1a) del estado de un combate: sirve para detectar que dos
// simulaciones han dejado de coincidir. Solo entra lo que afecta a la partida; quedan fuera
// efectos, cámara, poses y demás datos de dibujo.

const num = new DataView(new ArrayBuffer(8));
const byte = (h, b) => Math.imul(h ^ b, 16777619) >>> 0;

/** Añade valores (números, textos, booleanos o nada) a un hash. */
export function mix(h, ...values) {
  for (const v of values) {
    if (typeof v === 'number') {
      num.setFloat64(0, v);
      for (let i = 0; i < 8; i++) h = byte(h, num.getUint8(i));
    } else {
      const s = String(v);
      for (let i = 0; i < s.length; i++) h = byte(h, s.charCodeAt(i));
      h = byte(h, 0);
    }
  }
  return h;
}

export const HASH_START = 2166136261;

const FIGHTER = ['x', 'y', 'vx', 'vy', 'hp', 'energy', 'state', 'facing', 'onGround', 'noGravity', 'invulnT', 'hurtT', 'dizzyT'];
// campos de las entidades de los especiales (los que no existan cuentan como "undefined")
const ENTITY = ['x', 'y', 'y0', 'vx', 'vy', 't', 'dead', 'dangerous', 'hit', 'left', 'tail', 'landT', 'delay', 'tx', 'punchT'];

export function hashState(m) {
  let h = mix(HASH_START, m.frame, m.phase, m.phaseT, m.time, m.hitstop, m.timeScale, m.slow, m.rng.state, m.count);
  h = mix(h, m.result?.winner, m.result?.reason);
  m.fighters.forEach((f, i) => {
    for (const k of FIGHTER) h = mix(h, f[k]);
    const l = m.latch[i];
    h = mix(h, l.x, l.jump, l.punch, l.kick, l.special);
    h = mix(h, f.buf.jump, f.buf.punch, f.buf.kick, f.buf.special);
    const a = f.action;
    h = mix(h, a?.kind, a?.t, a?.hit, a?.keepVel);
    if (a?.s) {
      for (const k of Object.keys(a.s).sort()) {
        const v = a.s[k];
        if (typeof v !== 'object') h = mix(h, k, v);
      }
      h = mix(h, a.s.volley?.hit);
    }
  });
  for (const e of m.entities) {
    h = mix(h, e.constructor.name);
    for (const k of ENTITY) h = mix(h, e[k]);
  }
  return h;
}
