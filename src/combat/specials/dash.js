// ESPECIAL: EMBESTIDA. Carga un instante y sale disparado hacia delante.
// params: startup, speed, duration, recovery,
//         run? (va corriendo por el suelo y remata con un cabezazo),
//         form? ({ head?, body? }: transformación mientras dura el especial),
//         reach? (alcance del golpe), poses? ({ charge, go, hit })
import { rand } from '../../config.js';
import { specialHit } from './common.js';
import { sfx } from '../../engine/audio.js';

/** Nube de transformación. */
function poof(f, fx, world) {
  world.fx.dust(f.x, f.y - 40, 10);
  world.fx.ring(f.x, f.y - 55, fx.color2 || '#fff', 90, 0.3);
  for (let i = 0; i < 10; i++) world.fx.glow(f.x, f.y - 55, i % 2 ? fx.color : fx.color2, rand(8, 18), 0.35, rand(-220, 220), rand(-220, 220));
}

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
      if (p.form && !s.form && a.t >= p.startup * 0.35) {
        s.form = { ...f.cfg, head: p.form.head || f.cfg.head, body: { ...f.cfg.body, ...p.form.body } };
        poof(f, fx, world);
      }
      const ang = rand(Math.PI * 2);
      world.fx.glow(f.x + Math.cos(ang) * 50, f.y - 60 + Math.sin(ang) * 50, fx.color2 || '#fff', 7, 0.18, -Math.cos(ang) * 260, -Math.sin(ang) * 260);
      if (a.t >= p.startup) {
        s.phase = 'dash';
        s.t0 = a.t;
        a.keepVel = true;
        if (!p.run) {
          f.noGravity = true;
          f.vy = 0;
        }
        world.fx.ring(f.x, f.y - 50, fx.color || '#fff', 110, 0.3);
        world.fx.dust(f.x, 0, 8, -f.facing);
        world.camera.shake(6);
        sfx.shoot();
      }
    } else if (s.phase === 'dash') {
      f.vx = f.facing * p.speed;
      if (p.run) {
        f.walkPhase += p.speed * dt * 0.035;
        if (f.onGround && Math.random() < 0.4) world.fx.dust(f.x - f.facing * 20, 0, 1, -f.facing);
      }
      // estela
      world.fx.glow(f.x - f.facing * 20, f.y - 60 + rand(-30, 30), fx.color || '#fff', rand(14, 26), 0.3);
      if (fx.trail === 'bolt' && Math.random() < 0.7) {
        world.fx.bolt(f.x - f.facing * 20, f.y - rand(20, 110), f.x - f.facing * rand(110, 190), f.y - rand(10, 120), fx.color2 || fx.color);
      }
      world.fx.speedLines(f.facing, 2);
      if (!s.hit) {
        const reach = p.reach ?? 84;
        const box = { x: f.facing > 0 ? f.x : f.x - reach, y: f.y - 104, w: reach, h: 96 };
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
      const end = a.t - s.t1 >= p.recovery;
      if (end && s.form) poof(f, fx, world);
      return end;
    }
    return false;
  },
  pose(f, a, sp) {
    const { run, form, poses } = sp.params;
    if (poses) {
      if (a.s.phase === 'charge') return poses.charge;
      if (a.s.phase === 'dash') return a.s.hit ? poses.hit : poses.go;
      return a.s.hit && a.t - a.s.t1 < 0.16 ? poses.hit : 'recover';
    }
    if (form && a.s.phase === 'charge') return 'transform';
    if (run && a.s.phase === 'dash') return a.s.hit ? 'headbutt' : 'headRun';
    if (run && a.s.hit && a.t - a.s.t1 < 0.18) return 'headbutt';
    return a.s.phase === 'charge' ? 'dashCharge' : a.s.phase === 'dash' ? 'dashGo' : 'recover';
  },
  cancel(f) {
    f.noGravity = false;
  },
};
