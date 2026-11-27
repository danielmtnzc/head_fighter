// ESPECIAL: CALADA. Saca un cigarro, le da una calada larga (la brasa se aviva)
// y suelta por la boca una nube de humo que avanza y golpea una vez.
// params: startup (dura la calada), duration (soplido), recovery, reach,
//         mouthX?, mouthY?, cloudH? (alto de la nube), dizzy? (segundos de mareo)
import { OUTLINE, rand } from '../../config.js';
import { specialHit } from './common.js';
import { sfx } from '../../engine/audio.js';

const GROW = 0.3; // segundos que tarda la nube en llegar a su alcance

export default {
  start(f, sp, world, a) {
    a.s.hit = false;
    a.s.blown = false;
    a.s.inhaled = false;
    a.s.wisp = 0;
  },
  update(f, sp, world, dt, a) {
    const p = sp.params;
    const s = a.s;
    const fx = sp.fx || {};
    const mx = f.x + f.facing * (p.mouthX ?? 30);
    const my = f.y + (p.mouthY ?? -60);

    // calada: la brasa se aviva y sale un hilillo de humo gris del cigarro
    if (a.t < p.startup) {
      if (!s.inhaled && a.t > p.startup * 0.3) {
        s.inhaled = true;
        sfx.inhale();
      }
      s.wisp -= dt;
      if (s.wisp <= 0) {
        s.wisp = 0.06;
        world.fx.add({
          type: 'puff', x: mx + f.facing * 6, y: my - 6, vx: f.facing * rand(-10, 20), vy: rand(-70, -40),
          life: 0.5, max: 0.5, size: rand(2, 4), color: 'rgba(210,214,220,0.9)', alpha: 0.6, grow: 2,
        });
      }
      return false;
    }

    const t = a.t - p.startup;
    if (t > p.duration) return t >= p.duration + p.recovery;
    if (!s.blown) {
      s.blown = true;
      world.camera.shake(4);
      sfx.exhale();
    }
    // soplido: bocanadas verdes que se hinchan y frenan
    const speed = p.reach / 0.35;
    for (let i = 0; i < 4; i++) {
      world.fx.add({
        type: 'puff', x: mx, y: my + rand(-6, 6),
        vx: f.facing * speed * rand(0.7, 1.15), vy: rand(-60, 30), drag: 3.2,
        life: rand(0.6, 0.95), max: 0.95, size: rand(7, 13), color: i % 2 ? fx.color : fx.color2, alpha: 0.75,
      });
    }
    if (!s.hit) {
      const len = p.reach * Math.min(1, t / GROW);
      const h = p.cloudH ?? 70;
      const x0 = f.facing > 0 ? f.x : mx - len;
      const x1 = f.facing > 0 ? mx + len : f.x;
      const box = { x: x0, y: my - h / 2, w: x1 - x0, h };
      const over = { dir: f.facing, knockback: { x: 520, y: -300 } };
      if (p.dizzy) over.dizzy = p.dizzy;
      const o = world.opponentOf(f);
      if (world.tryHit(f, o, box, specialHit(sp, over))) {
        s.hit = true;
        // la nube envuelve al rival
        for (let i = 0; i < 14; i++) {
          const ang = rand(Math.PI * 2);
          world.fx.add({
            type: 'puff', x: o.x + Math.cos(ang) * 20, y: o.y - 70 + Math.sin(ang) * 26,
            vx: Math.cos(ang) * rand(40, 120), vy: Math.sin(ang) * rand(30, 90) - 30, drag: 2,
            life: rand(0.7, 1.1), max: 1.1, size: rand(9, 16), color: i % 2 ? fx.color : fx.color2, alpha: 0.7,
          });
        }
      }
    }
    return false;
  },
  pose(f, a, sp) {
    const { startup, duration } = sp.params;
    if (a.t < startup) return 'smokeDrag';
    return a.t < startup + duration ? 'smokeBlow' : 'recover';
  },
  prop(ctx, f, a, sp) {
    // cigarro entre los dedos, siempre apuntando hacia delante y un poco arriba
    const { startup } = sp.params;
    const [s1, s2] = f.pose.af;
    ctx.rotate(-(Math.PI / 2 - s1 - s2) - 0.2);
    const k = Math.min(1, a.t / 0.12);
    ctx.scale(k, k);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.4;
    const h = 2.1;
    ctx.fillStyle = '#d98a3a'; // filtro
    ctx.fillRect(-3, -h, 6, h * 2);
    ctx.strokeRect(-3, -h, 6, h * 2);
    ctx.fillStyle = '#f6f4ee'; // papel
    ctx.fillRect(3, -h, 12, h * 2);
    ctx.strokeRect(3, -h, 12, h * 2);
    // brasa: se aviva durante la calada
    const drag = a.t < startup ? Math.min(1, a.t / startup) : 0.3;
    const glow = 0.5 + drag * 0.5 + Math.sin(a.t * 40) * 0.08;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255,120,40,${0.4 * glow})`;
    ctx.beginPath();
    ctx.arc(16.5, 0, 3 + drag * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = drag > 0.5 ? '#ffd23f' : '#ff6a2a';
    ctx.fillRect(15, -h, 3, h * 2);
    ctx.strokeRect(15, -h, 3, h * 2);
  },
};
