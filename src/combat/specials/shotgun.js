// ESPECIAL: ESCOPETA DE FERIA. Saca la escopeta, apunta y dispara un tapón de corcho.
// params: startup, recovery, speed, radius, muzzleX?, muzzleY?, recoil?
import { STAGE, OUTLINE, rand } from '../../config.js';
import { specialHit } from './common.js';
import { sfx } from '../../engine/audio.js';

const CONFETTI = ['#ff3d5a', '#ffd23f', '#7df9ff', '#2fbf71', '#ffffff'];

class Cork {
  constructor(owner, sp, x, y) {
    this.owner = owner;
    this.sp = sp;
    this.dir = owner.facing;
    this.x = x;
    this.y = y;
    this.vx = this.dir * sp.params.speed;
    this.r = sp.params.radius || 14;
    this.t = 0;
    this.tail = owner.x; // el primer paso cubre desde el tirador, para no fallar a bocajarro
    this.dangerous = true;
    this.dead = false;
  }

  update(dt, world) {
    this.t += dt;
    this.x += this.vx * dt;
    const r = this.r;
    const x0 = Math.min(this.tail, this.x - r);
    const x1 = Math.max(this.tail, this.x + r);
    this.tail = this.x;
    world.fx.add({
      type: 'dust', x: this.x - this.dir * r, y: this.y + rand(-4, 4), vx: rand(-20, 20), vy: rand(-30, 10),
      life: 0.3, max: 0.3, size: rand(4, 8), color: 'rgba(255,245,225,0.6)', grav: 0,
    });
    const box = { x: x0, y: this.y - r, w: x1 - x0, h: r * 2 };
    const spec = specialHit(this.sp, { dir: this.dir, knockback: { x: 680, y: -360 } });
    const hit = world.tryHit(this.owner, world.opponentOf(this.owner), box, spec);
    if (hit || this.x < STAGE.left - 60 || this.x > STAGE.right + 60) {
      this.dead = true;
      if (hit) {
        for (const c of CONFETTI) world.fx.debris(this.x, this.y - 10, 5, c, 620);
        sfx.boom();
      }
    }
  }

  draw(ctx) {
    const r = this.r;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.dir, 1);
    ctx.rotate(Math.sin(this.t * 30) * 0.15);
    ctx.beginPath();
    ctx.moveTo(-r, -r * 0.65);
    ctx.lineTo(r, -r * 0.9);
    ctx.lineTo(r, r * 0.9);
    ctx.lineTo(-r, r * 0.65);
    ctx.closePath();
    ctx.fillStyle = '#d9a066';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    ctx.fillStyle = '#9c6532';
    for (const [x, y] of [[-0.4, -0.2], [0.15, 0.35], [0.5, -0.35]]) ctx.fillRect(x * r, y * r, 3, 3);
    ctx.restore();
  }
}

export default {
  start(f, sp, world, a) {
    a.s.fired = false;
  },
  update(f, sp, world, dt, a) {
    const p = sp.params;
    if (!a.s.fired && a.t >= p.startup) {
      a.s.fired = true;
      const fx = sp.fx || {};
      const x = f.x + f.facing * (p.muzzleX ?? 98);
      const y = f.y + (p.muzzleY ?? -57);
      world.spawn(new Cork(f, sp, x, y));
      // fogonazo y humo en la boca del cañón
      world.fx.add({ type: 'burst', x, y, life: 0.16, max: 0.16, size: 46, rot: rand(Math.PI), color: fx.color || '#ff9f45' });
      for (let i = 0; i < 8; i++) {
        world.fx.add({
          type: 'dust', x, y, vx: f.facing * rand(40, 260), vy: rand(-90, 40),
          life: rand(0.3, 0.6), max: 0.6, size: rand(7, 14), color: 'rgba(255,245,225,0.7)', grav: -60,
        });
      }
      f.vx = -f.facing * (p.recoil ?? 260);
      world.fx.flash(fx.color2 || '#fff', 0.22);
      world.camera.shake(8);
      sfx.shotgun();
    }
    return a.t >= p.startup + p.recovery;
  },
  pose(f, a, sp) {
    const { startup } = sp.params;
    if (a.t < startup * 0.4) return 'gunDraw';
    return a.t >= startup && a.t < startup + 0.16 ? 'gunRecoil' : 'gunAim';
  },
  /** Escopeta, dibujada con el origen en la mano delantera y el cañón hacia +x. */
  prop(ctx, f, a, sp) {
    const k = Math.min(1, a.t / (sp.params.startup * 0.3));
    ctx.scale(k, k);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.5;
    const shape = (fill, pts) => {
      ctx.beginPath();
      pts.forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.stroke();
    };
    shape('#8f979f', [[-6, -7], [50, -7], [50, 1], [-6, 1]]); // cañón
    shape('#8a4b23', [[-34, -4], [-8, -8], [0, -6], [0, 4], [-12, 5], [-34, 13]]); // culata
    shape('#a85f2e', [[0, 0], [28, 0], [24, 8], [0, 7]]); // guardamanos
    shape('#e63946', [[33, -8.5], [39, -8.5], [39, 2.5], [33, 2.5]]); // anillo rojo de caseta
    shape('#ffd23f', [[46, -12], [50, -12], [50, -7], [46, -7]]); // punto de mira
    if (!a.s.fired) shape('#d9a066', [[50, -6], [57, -7.5], [57, 1.5], [50, 0]]); // tapón
    ctx.strokeStyle = '#e8edf2';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(2, -5);
    ctx.lineTo(30, -5);
    ctx.stroke();
  },
};
