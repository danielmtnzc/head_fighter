// ESPECIAL: EXPLOSIÓN. Salta, cae en plancha y revienta el suelo: explosión cercana
// más ondas sísmicas que recorren el suelo a ambos lados (se pueden saltar).
// params: leap, blastRadius, waveSpeed, waveRange, waveDamage (fracción del daño), recovery,
//         waves? (false para solo explosión)
import { STAGE, OUTLINE, rand } from '../../config.js';
import { specialHit } from './common.js';
import { sfx } from '../../engine/audio.js';

class Shockwave {
  constructor(owner, sp, dir) {
    this.owner = owner;
    this.sp = sp;
    this.dir = dir;
    this.x = owner.x + dir * 40;
    this.vx = dir * (sp.params.waveSpeed || 560);
    this.left = sp.params.waveRange || 400;
    this.t = 0;
    this.dangerous = true;
    this.dead = false;
  }

  update(dt, world) {
    const step = Math.abs(this.vx) * dt;
    this.x += this.vx * dt;
    this.left -= step;
    this.t += dt;
    if (Math.random() < 0.6) world.fx.debris(this.x, 0, 1, this.sp.fx?.color2 || '#c9a27a', 320);
    world.fx.dust(this.x, 0, 1);
    const box = { x: this.x - 24, y: -52, w: 48, h: 52 };
    const spec = specialHit(this.sp, {
      damage: this.sp.damage * (this.sp.params.waveDamage ?? 0.6),
      knockback: { x: 260, y: -640 },
      dir: this.dir,
      power: 2,
      shake: 8,
    });
    if (world.tryHit(this.owner, world.opponentOf(this.owner), box, spec)) this.dead = true;
    if (this.left <= 0 || this.x < STAGE.left || this.x > STAGE.right) this.dead = true;
  }

  draw(ctx) {
    const k = Math.min(1, this.left / 120);
    ctx.save();
    ctx.translate(this.x, 0);
    ctx.scale(this.dir, 1);
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = OUTLINE;
    // rocas que brotan del suelo
    const spikes = [[-26, 26, 18], [-6, 50, 22], [16, 34, 16]];
    spikes.forEach(([x, h, w], i) => {
      const hh = h * k * (0.85 + Math.sin(this.t * 30 + i * 2) * 0.15);
      ctx.beginPath();
      ctx.moveTo(x - w / 2, 2);
      ctx.lineTo(x + w * 0.15, -hh);
      ctx.lineTo(x + w / 2, 2);
      ctx.closePath();
      ctx.fillStyle = i === 1 ? this.sp.fx?.color || '#2ec4b6' : this.sp.fx?.color2 || '#c9a27a';
      ctx.fill();
      ctx.stroke();
    });
    ctx.restore();
  }
}

export default {
  start(f, sp, world, a) {
    a.s.phase = 'leap';
    a.keepVel = true;
    if (f.onGround) {
      f.vy = -(sp.params.leap ?? 760);
      f.onGround = false;
      world.fx.dust(f.x, 0, 8);
    } else {
      f.vy = Math.min(f.vy, -260);
    }
    f.vx = f.facing * (sp.params.advance ?? 130);
  },
  update(f, sp, world, dt, a) {
    const p = sp.params;
    const s = a.s;
    const fx = sp.fx || {};
    if (s.phase === 'leap') {
      if (f.vy > 0) {
        f.vy += 3200 * dt; // caída en picado
        world.fx.glow(f.x + rand(-20, 20), f.y - 40, fx.color || '#fff', rand(10, 18), 0.22);
      }
      if (f.onGround && a.t > 0.06) {
        s.phase = 'rec';
        s.t1 = a.t;
        a.keepVel = false;
        f.vx = 0;
        // ¡impacto!
        world.camera.shake(20);
        world.fx.flash('#fff', 0.35);
        world.fx.ring(f.x, 0, fx.color || '#fff', 220, 0.45, true);
        world.fx.ring(f.x, -30, '#fff', p.blastRadius || 120, 0.3);
        world.fx.debris(f.x, 0, 16, fx.color2 || '#c9a27a', 620);
        world.fx.dust(f.x, 0, 14);
        sfx.boom();
        const R = p.blastRadius || 120;
        world.tryHit(f, world.opponentOf(f), { x: f.x - R, y: -R, w: R * 2, h: R + 10 }, specialHit(sp, { knockback: { x: 520, y: -760 } }));
        if (p.waves !== false) {
          world.spawn(new Shockwave(f, sp, 1));
          world.spawn(new Shockwave(f, sp, -1));
        }
      }
      return false;
    }
    return a.t - s.t1 >= p.recovery;
  },
  pose(f, a) {
    return a.s.phase === 'leap' ? 'slamUp' : 'slamDown';
  },
};
