// ESPECIAL: CHORRO. Suelta por la boca un chorro que avanza y golpea una vez.
// params: startup, duration, recovery, reach, mouthX?, mouthY?, sickSkin? (color de piel mientras dura)
import { rand } from '../../config.js';
import { specialHit } from './common.js';
import { sfx } from '../../engine/audio.js';

const GROW = 0.18; // segundos que tarda el chorro en llegar a su alcance

export default {
  start(f, sp, world, a) {
    a.s.hit = false;
    a.s.started = false;
  },
  update(f, sp, world, dt, a) {
    const p = sp.params;
    const s = a.s;
    const fx = sp.fx || {};
    if (p.sickSkin && !s.form && a.t >= p.startup * 0.25) {
      s.form = { ...f.cfg, head: { ...f.cfg.head, art: { ...f.cfg.head.art, skin: p.sickSkin } } };
    }
    const t = a.t - p.startup;
    if (t < 0 || t > p.duration) return t >= p.duration + p.recovery;
    if (!s.started) {
      s.started = true;
      world.camera.shake(5);
      sfx.splash();
    }
    const mx = f.x + f.facing * (p.mouthX ?? 34);
    const my = f.y + (p.mouthY ?? -62);
    const speed = p.reach / 0.4;
    for (let i = 0; i < 5; i++) {
      world.fx.add({
        type: 'drop', x: mx, y: my + rand(-5, 5), vx: f.facing * speed * rand(0.75, 1.1), vy: rand(-130, 0),
        life: rand(0.35, 0.5), max: 0.5, size: rand(6, 12), color: i % 3 ? fx.color : fx.color2, grav: 620,
      });
    }
    if (!s.hit) {
      const len = p.reach * Math.min(1, t / GROW);
      const x0 = f.facing > 0 ? f.x : mx - len;
      const x1 = f.facing > 0 ? mx + len : f.x;
      const box = { x: x0, y: my - 16, w: x1 - x0, h: 56 };
      if (world.tryHit(f, world.opponentOf(f), box, specialHit(sp, { dir: f.facing, knockback: { x: 640, y: -320 } }))) {
        s.hit = true;
        const o = world.opponentOf(f);
        world.fx.debris(o.x, o.y - 60, 8, fx.color, 460);
        sfx.splash();
      }
    }
    return false;
  },
  pose(f, a, sp) {
    const { startup, duration } = sp.params;
    if (a.t < startup) return 'sickWind';
    return a.t < startup + duration ? 'sickGo' : 'recover';
  },
};
