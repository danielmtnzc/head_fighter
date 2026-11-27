// ESPECIAL: MULTIGOLPE. Ráfaga de golpes rápidos y un remate final.
// params: startup, hits, interval, finisher (fracción del daño para el remate), recovery, advance
import { rand } from '../../config.js';
import { specialHit } from './common.js';
import { sfx } from '../../engine/audio.js';

export default {
  start(f, sp, world, a) {
    a.s.n = 0;
    a.s.next = sp.params.startup;
    a.s.fin = false;
    a.keepVel = true;
  },
  update(f, sp, world, dt, a) {
    const p = sp.params;
    const s = a.s;
    const fx = sp.fx || {};
    const share = p.finisher ?? 0.4;
    const opp = world.opponentOf(f);
    const front = (w, y, h) => ({ x: f.facing > 0 ? f.x + 6 : f.x - 6 - w, y: f.y + y, w, h });

    if (!s.fin && f.onGround) f.vx = f.facing * (p.advance ?? 100);

    if (s.n < p.hits && a.t >= s.next) {
      s.n++;
      s.next += p.interval;
      sfx.swing();
      world.fx.glow(f.x + f.facing * rand(50, 80), f.y - rand(35, 75), fx.color || '#fff', rand(10, 16), 0.16);
      world.tryHit(f, opp, front(96, -84, 64), specialHit(sp, {
        damage: (sp.damage * (1 - share)) / p.hits,
        knockback: { x: 50, y: 0 },
        hitstun: 0.32,
        invuln: 0, // los golpes de la ráfaga encadenan
        hitstop: 0.035,
        shake: 3,
        power: 1,
        text: null,
      }));
    }

    const finAt = p.startup + p.hits * p.interval + 0.07;
    if (!s.fin && a.t >= finAt) {
      s.fin = true;
      a.keepVel = false;
      f.vx = f.facing * 60;
      world.fx.ring(f.x + f.facing * 50, f.y - 80, fx.color2 || '#fff', 90, 0.25);
      if (world.tryHit(f, opp, front(100, -140, 132), specialHit(sp, { damage: sp.damage * share, knockback: { x: 280, y: -860 }, hitstun: 0.6 }))) {
        sfx.boom();
      }
    }
    return a.t >= finAt + p.recovery;
  },
  pose(f, a, sp) {
    if (a.s.fin) return 'uppercut';
    if (a.t < sp.params.startup) return 'punchWind';
    return a.s.n % 2 ? 'flurryA' : 'flurryB';
  },
};
