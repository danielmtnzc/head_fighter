// Físicas: gravedad, suelo, límites del escenario y separación entre luchadores.
import { GRAVITY, STAGE, BODY } from '../config.js';

const MIN_X = STAGE.left + BODY.halfW;
const MAX_X = STAGE.right - BODY.halfW;

/** Integra un luchador. Devuelve 'land', 'bounce' o null. */
export function integrate(f, dt) {
  if (!f.onGround && !f.noGravity) f.vy += GRAVITY * dt;
  f.x += f.vx * dt;
  f.y += f.vy * dt;

  let ev = null;
  if (f.y >= 0) {
    f.y = 0;
    if (!f.onGround && f.vy >= 0) {
      if (f.state === 'ko' && f.vy > 520) {
        // rebote dramático del K.O.
        f.vy = -f.vy * 0.36;
        f.vx *= 0.6;
        ev = 'bounce';
      } else {
        f.onGround = true;
        f.vy = 0;
        ev = 'land';
      }
    }
  }

  const tumbling = f.state === 'ko' || f.state === 'hurt';
  if (f.x < MIN_X) {
    f.x = MIN_X;
    f.vx = tumbling ? Math.abs(f.vx) * 0.45 : Math.max(0, f.vx);
  } else if (f.x > MAX_X) {
    f.x = MAX_X;
    f.vx = tumbling ? -Math.abs(f.vx) * 0.45 : Math.min(0, f.vx);
  }
  return ev;
}

/** Evita que dos luchadores se queden superpuestos. */
export function separate(a, b) {
  if (a.state === 'ko' || b.state === 'ko') return;
  if (Math.abs(a.y - b.y) > 96) return; // uno salta por encima del otro
  const dx = b.x - a.x;
  const over = BODY.minDist - Math.abs(dx);
  if (over <= 0) return;
  const s = dx > 0 ? 1 : dx < 0 ? -1 : a.side === 0 ? 1 : -1;
  a.x -= (s * over) / 2;
  b.x += (s * over) / 2;
  // si uno choca con la pared, el otro absorbe el resto
  if (a.x < MIN_X) { b.x += MIN_X - a.x; a.x = MIN_X; }
  if (a.x > MAX_X) { b.x -= a.x - MAX_X; a.x = MAX_X; }
  if (b.x < MIN_X) { a.x += MIN_X - b.x; b.x = MIN_X; }
  if (b.x > MAX_X) { a.x -= b.x - MAX_X; b.x = MAX_X; }
}
