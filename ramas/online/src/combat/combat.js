// Sistema de impactos: cajas de colisión, comprobación de contacto y aplicación del daño.
import { BODY, clamp } from '../config.js';

export function hurtbox(f) {
  return { x: f.x - BODY.halfW, y: f.y - BODY.height, w: BODY.halfW * 2, h: BODY.height };
}

export function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/**
 * Intenta golpear a `def` con la caja `box` (coordenadas de mundo).
 * spec: { damage, knockback:{x,y}, hitstun, hitstop, shake, power, invuln?, dir?, text?, color? }
 * Devuelve true si hubo contacto. Respeta la invulnerabilidad tras un golpe.
 */
export function tryHit(world, att, def, box, spec) {
  if (!def || world.phase !== 'fight' || def.state === 'ko' || def.invulnT > 0) return false;
  const hb = hurtbox(def);
  if (!overlap(box, hb)) return false;
  const dir = spec.dir || (def.x === att.x ? att.facing : def.x > att.x ? 1 : -1);
  const px = clamp(box.x + box.w / 2, hb.x, hb.x + hb.w);
  const py = clamp(box.y + box.h / 2, hb.y + 10, hb.y + hb.h - 10);
  def.takeHit(spec, dir);
  world.onHit(att, def, spec, px, py);
  return true;
}
