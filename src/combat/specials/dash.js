// ESPECIAL: EMBESTIDA. Carga un instante y sale disparado hacia delante.
// params: startup, speed, duration, recovery
import { rand } from '../../config.js';
import { specialHit } from './common.js';
import { sfx } from '../../engine/audio.js';

export default {
  start(f, sp, world, a) {
    a.s.phase = 'charge';
    a.s.hit = false;
  },
  update(f, sp, world, dt, a) {
    const p = sp.params;
    const s = a.s;
    const fx = sp.fx || {};
    if (s.phase === 'charge') {
      const ang = rand(Math.PI * 2);
      world.fx.glow(f.x + Math.cos(ang) * 50, f.y - 60 + Math.sin(ang) * 50, fx.color2 || '#fff', 7, 0.18, -Math.cos(ang) * 260, -Math.sin(ang) * 260);
      if (a.t >= p.startup) {
        s.phase = 'dash';
        s.t0 = a.t;
        a.keepVel = true;
        f.noGravity = true;
        f.vy = 0;
        world.fx.ring(f.x, f.y - 50, fx.color || '#fff', 110, 0.3);
        world.fx.dust(f.x, 0, 8, -f.facing);
        world.camera.shake(6);
        sfx.shoot();
      }
    } else if (s.phase === 'dash') {
      f.vx = f.facing * p.speed;
      // estela
      world.fx.glow(f.x - f.facing * 20, f.y - 60 + rand(-30, 30), fx.color || '#fff', rand(14, 26), 0.3);
      if (fx.trail === 'bolt' && Math.random() < 0.7) {
        world.fx.bolt(f.x - f.facing * 20, f.y - rand(20, 110), f.x - f.facing * rand(110, 190), f.y - rand(10, 120), fx.color2 || fx.color);
      }
      world.fx.speedLines(f.facing, 2);
      if (!s.hit) {
        const box = { x: f.facing > 0 ? f.x : f.x - 84, y: f.y - 104, w: 84, h: 96 };
        if (world.tryHit(f, world.opponentOf(f), box, specialHit(sp, { knockback: { x: 700, y: -380 } }))) {
          s.hit = true;
          s.endAt = a.t + 0.04;
          sfx.boom();
        }
      }
      if (a.t - s.t0 >= p.duration || (s.hit && a.t >= s.endAt)) {
        s.phase = 'rec';
        s.t1 = a.t;
        a.keepVel = false;
        f.noGravity = false;
        f.vx *= 0.25;
      }
    } else {
      return a.t - s.t1 >= p.recovery;
    }
    return false;
  },
  pose(f, a) {
    return a.s.phase === 'charge' ? 'dashCharge' : a.s.phase === 'dash' ? 'dashGo' : 'recover';
  },
  cancel(f) {
    f.noGravity = false;
  },
};
