// ESPECIAL: PROYECTIL. El personaje lanza algo (bola de energía, objeto...).
// params: startup, recovery, speed, radius, gravity?, vy?, life?, spawnX?, spawnY?, recoil?,
//         sprite? (ruta de imagen para lanzar un objeto), spin? (rad/s)
import { STAGE, OUTLINE, rand } from '../../config.js';
import { specialHit } from './common.js';
import { sfx } from '../../engine/audio.js';

const sprites = new Map();
function sprite(src) {
  if (!sprites.has(src)) {
    const img = new Image();
    img.src = src;
    sprites.set(src, img);
  }
  return sprites.get(src);
}

class Projectile {
  constructor(owner, sp) {
    const p = sp.params;
    this.owner = owner;
    this.sp = sp;
    this.dir = owner.facing;
    this.x = owner.x + owner.facing * (p.spawnX ?? 56);
    this.y = owner.y + (p.spawnY ?? -50);
    this.vx = owner.facing * p.speed;
    this.vy = p.vy || 0;
    this.gravity = p.gravity || 0;
    this.r = p.radius || 20;
    this.life = p.life || 2.4;
    this.t = 0;
    this.rot = 0;
    this.dangerous = true;
    this.dead = false;
    this.img = p.sprite ? sprite(p.sprite) : null;
  }

  update(dt, world) {
    const fx = this.sp.fx || {};
    this.t += dt;
    this.vy += this.gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rot += (this.sp.params.spin ?? 10) * dt * this.dir;
    world.fx.glow(this.x - this.dir * this.r * 0.6 + rand(-6, 6), this.y + rand(-8, 8), fx.color || '#fff', this.r * 0.8, 0.28, -this.vx * 0.15, rand(-40, 40));

    const box = { x: this.x - this.r, y: this.y - this.r, w: this.r * 2, h: this.r * 2 };
    const hit = world.tryHit(this.owner, world.opponentOf(this.owner), box, specialHit(this.sp, { dir: this.dir }));
    const out = this.x < STAGE.left - 60 || this.x > STAGE.right + 60 || this.y > 0 || this.t > this.life;
    if (hit || out) {
      this.dead = true;
      const x = Math.max(STAGE.left, Math.min(STAGE.right, this.x));
      world.fx.ring(x, Math.min(this.y, -4), fx.color2 || '#fff', 90, 0.3);
      for (let i = 0; i < 12; i++) world.fx.glow(x, this.y, i % 2 ? fx.color : fx.color2, rand(8, 18), rand(0.25, 0.5), rand(-260, 260), rand(-300, 120));
      if (hit) sfx.boom();
    }
  }

  draw(ctx) {
    const fx = this.sp.fx || {};
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.img && this.img.complete && this.img.naturalWidth) {
      ctx.rotate(this.rot);
      const s = (this.r * 2.4) / Math.max(this.img.width, this.img.height);
      ctx.drawImage(this.img, (-this.img.width * s) / 2, (-this.img.height * s) / 2, this.img.width * s, this.img.height * s);
    } else {
      const flick = 1 + Math.sin(this.t * 50) * 0.08;
      const r = this.r * flick;
      ctx.scale(this.dir, 1);
      // cola de llama
      ctx.beginPath();
      ctx.moveTo(r * 0.4, -r);
      ctx.quadraticCurveTo(-r * 2.6, -r * 0.5, -r * (2.8 + Math.sin(this.t * 40) * 0.4), 0);
      ctx.quadraticCurveTo(-r * 2.6, r * 0.5, r * 0.4, r);
      ctx.fillStyle = fx.color || '#ff7a1a';
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.globalAlpha = 1;
      // núcleo
      const g = ctx.createRadialGradient(r * 0.15, 0, r * 0.1, 0, 0, r);
      g.addColorStop(0, '#fff');
      g.addColorStop(0.45, fx.color2 || '#ffe45c');
      g.addColorStop(1, fx.color || '#ff7a1a');
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = OUTLINE;
      ctx.stroke();
    }
    ctx.restore();
  }
}

export default {
  start(f, sp, world, a) {
    a.s.fired = false;
  },
  update(f, sp, world, dt, a) {
    const p = sp.params;
    if (!a.s.fired) {
      // carga: energía concentrándose en las manos
      world.fx.glow(f.x - f.facing * 22 + rand(-16, 16), f.y - 52 + rand(-16, 16), sp.fx?.color || '#fff', rand(6, 12), 0.2);
      if (a.t >= p.startup) {
        a.s.fired = true;
        world.spawn(new Projectile(f, sp));
        f.vx = -f.facing * (p.recoil ?? 170);
        world.fx.flash(sp.fx?.color || '#fff', 0.22);
        world.camera.shake(5);
        sfx.shoot();
      }
    }
    return a.t >= p.startup + p.recovery;
  },
  pose(f, a, sp) {
    return a.t < sp.params.startup ? 'castWind' : 'castThrow';
  },
};
