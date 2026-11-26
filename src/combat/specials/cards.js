// ESPECIAL: CARTONES. Grita una frase (bocadillo) y lanza en ráfaga cartones cuadrados de
// colores que viajan girando en línea recta (se pueden saltar). Solo impacta el primero, que deja
// al rival mareado (controles invertidos y más lento) unos segundos; los demás le atraviesan.
// params: startup, recovery, say?, count (cartones), interval (s entre cartones), speed,
//         size (lado del cartón), spawnX, spawnY, spread (dispersión vertical), dizzy (s de mareo),
//         colors (lista de colores)
import { STAGE, OUTLINE, rand } from '../../config.js';
import { specialHit } from './common.js';
import { sfx } from '../../engine/audio.js';

const COLORS = ['#ff4f8b', '#ffd23f', '#3ddc97', '#3d9bff', '#b56bff', '#ff8a3d'];

/** Cartón cuadrado centrado en el origen, con marco claro y una estrellita. */
function drawCard(ctx, size, color) {
  const h = size / 2;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = OUTLINE;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-h, -h, size, size, 3);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 2;
  ctx.strokeRect(-h + 4, -h + 4, size - 8, size - 8);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  for (let j = 0; j < 8; j++) {
    const r = j % 2 ? size * 0.08 : size * 0.22;
    const b = (j / 8) * Math.PI * 2 - Math.PI / 2;
    ctx.lineTo(Math.cos(b) * r, Math.sin(b) * r);
  }
  ctx.closePath();
  ctx.fill();
}

class Card {
  constructor(world, owner, sp, i, volley) {
    this.volley = volley; // estado compartido de la ráfaga: solo impacta un cartón
    const p = sp.params;
    this.owner = owner;
    this.sp = sp;
    this.dir = owner.facing;
    this.size = p.size || 26;
    this.color = (p.colors || COLORS)[i % (p.colors || COLORS).length];
    this.x = owner.x + owner.facing * (p.spawnX ?? 50);
    this.y0 = owner.y + (p.spawnY ?? -72) + (i % 2 ? 1 : -1) * world.rng.range(0, p.spread ?? 12);
    this.y = this.y0;
    this.vx = owner.facing * (p.speed || 760);
    this.t = 0;
    this.phase = rand(0, Math.PI * 2); // vaivén, solo visual
    this.rot = rand(0, Math.PI);
    this.dangerous = true;
    this.dead = false;
  }

  /** Si la ráfaga ya ha impactado (lo lee la suma de comprobación). */
  get hit() {
    return this.volley.hit;
  }

  update(dt, world) {
    this.t += dt;
    this.x += this.vx * dt;
    this.rot += 14 * dt * this.dir;
    if (Math.random() < 0.5) world.fx.glow(this.x - this.dir * 10, this.y + rand(-8, 8), this.color, rand(4, 8), 0.25, -this.vx * 0.1, rand(-30, 30));

    const h = this.size / 2 + 4;
    const box = { x: this.x - h, y: this.y - h, w: h * 2, h: h * 2 };
    const p = this.sp.params;
    const hit = !this.volley.hit && world.tryHit(this.owner, world.opponentOf(this.owner), box, specialHit(this.sp, {
      dir: this.dir, dizzy: p.dizzy ?? 2.5, knockback: { x: 380, y: -260 }, hitstun: 0.4,
    }));
    if (hit) {
      this.volley.hit = true;
      this.dead = true;
      world.fx.ring(this.x, this.y, '#ffffff', 80, 0.3);
      for (const c of p.colors || COLORS) world.fx.debris(this.x, Math.min(this.y, -4), 2, c, 420);
      sfx.boom();
    } else if (this.x < STAGE.left - 60 || this.x > STAGE.right + 60) this.dead = true;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y + Math.sin(this.t * 14 + this.phase) * 5);
    ctx.rotate(this.rot);
    drawCard(ctx, this.size, this.color);
    ctx.restore();
  }
}

const throwEnd = (p) => p.startup + ((p.count || 4) - 1) * (p.interval || 0.09);

export default {
  start(f, sp, world, a) {
    a.s.thrown = 0;
    a.s.volley = { hit: false };
  },
  update(f, sp, world, dt, a) {
    const p = sp.params;
    const count = p.count || 4;
    while (a.s.thrown < count && a.t >= p.startup + a.s.thrown * (p.interval || 0.09)) {
      world.spawn(new Card(world, f, sp, a.s.thrown, a.s.volley));
      a.s.thrown++;
      sfx.swing();
      if (a.s.thrown === 1) world.camera.shake(4);
    }
    return a.t >= throwEnd(p) + p.recovery;
  },
  pose(f, a, sp) {
    const p = sp.params;
    if (a.t < p.startup) return 'castWind';
    if (a.t > throwEnd(p) + 0.05) return 'castThrow';
    // brazo que va y viene mientras reparte los cartones
    return Math.floor((a.t - p.startup) / ((p.interval || 0.09) * 1)) % 2 ? 'punchWind' : 'castThrow';
  },
  /** Abanico de cartones en la mano mientras carga. */
  prop(ctx, f, a, sp) {
    if (a.t >= sp.params.startup) return;
    const colors = sp.params.colors || COLORS;
    const k = Math.min(1, a.t / (sp.params.startup * 0.3));
    const size = (sp.params.size || 26) * 0.85;
    ctx.scale(k, k);
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.rotate(-0.5 + i * 0.3);
      ctx.translate(0, -size * 0.6);
      drawCard(ctx, size, colors[i % colors.length]);
      ctx.restore();
    }
  },
};
