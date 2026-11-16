// Sistema de efectos visuales: partículas, estallidos de impacto, textos cómic,
// anillos, rayos, destellos de pantalla y líneas de velocidad.
import { FONT, OUTLINE, rand } from '../config.js';

const MAX_PARTS = 500;

export class Effects {
  constructor() {
    this.parts = [];
    this.texts = [];
    this.lines = []; // líneas de velocidad (espacio de pantalla)
    this.flashA = 0;
    this.flashC = '#fff';
    this.dimA = 0; // oscurecimiento dramático del fondo (especiales)
    this.dimT = 0;
  }

  add(p) {
    if (this.parts.length < MAX_PARTS) this.parts.push(p);
  }

  /** Estallido de impacto: estrella + chispas + anillo según la potencia (1-3). */
  impact(x, y, power = 1, color = '#ffd23f') {
    this.add({ type: 'burst', x, y, life: 0.2, max: 0.2, size: 34 + power * 20, rot: rand(Math.PI), color });
    const n = 5 + power * 5;
    for (let i = 0; i < n; i++) {
      const a = rand(Math.PI * 2);
      const s = rand(180, 420) * (0.7 + power * 0.35);
      this.add({
        type: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80,
        life: rand(0.18, 0.4), max: 0.4, size: rand(2.5, 5), color: i % 3 ? color : '#fff', grav: 900,
      });
    }
    if (power >= 2) this.ring(x, y, '#fff', 50 + power * 30, 0.28);
  }

  /** Nube de polvo en el suelo. */
  dust(x, y, n = 6, dir = 0) {
    for (let i = 0; i < n; i++) {
      this.add({
        type: 'dust', x: x + rand(-14, 14), y: y - rand(0, 6),
        vx: rand(-90, 90) + dir * 120, vy: rand(-90, -20),
        life: rand(0.25, 0.5), max: 0.5, size: rand(7, 14), color: 'rgba(255,240,220,0.55)', grav: 60,
      });
    }
  }

  ring(x, y, color = '#fff', size = 80, life = 0.3, flat = false) {
    this.add({ type: 'ring', x, y, life, max: life, size, color, flat });
  }

  /** Bola luminosa que se encoge (estelas de fuego/energía). */
  glow(x, y, color, size = 14, life = 0.3, vx = 0, vy = 0) {
    this.add({ type: 'glow', x, y, vx, vy, life, max: life, size, color, grav: 0 });
  }

  /** Fragmentos sólidos (rocas, confeti). */
  debris(x, y, n, color, speed = 400) {
    for (let i = 0; i < n; i++) {
      const a = rand(-Math.PI * 0.95, -Math.PI * 0.05);
      const s = rand(speed * 0.4, speed);
      this.add({
        type: 'chunk', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, rot: rand(6), vr: rand(-12, 12),
        life: rand(0.4, 0.8), max: 0.8, size: rand(4, 9), color, grav: 1800,
      });
    }
  }

  /** Rayo quebrado entre dos puntos. */
  bolt(x1, y1, x2, y2, color = '#fff7ae', life = 0.14) {
    const pts = [[x1, y1]];
    const segs = 6;
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      pts.push([x1 + (x2 - x1) * t + rand(-14, 14), y1 + (y2 - y1) * t + rand(-14, 14)]);
    }
    pts.push([x2, y2]);
    this.add({ type: 'bolt', pts, life, max: life, color, x: 0, y: 0 });
  }

  /** Texto cómic: ¡ZAS!, ¡PAM!... */
  text(x, y, str, color = '#ffd23f', size = 44) {
    this.texts.push({ x, y, str, color, size, life: 0.75, max: 0.75, rot: rand(-0.25, 0.25) });
  }

  flash(color = '#fff', a = 0.5) {
    this.flashC = color;
    this.flashA = Math.max(this.flashA, a);
  }

  dim(time = 0.4) {
    this.dimT = Math.max(this.dimT, time);
  }

  /** Líneas de velocidad horizontales en pantalla. dir = sentido del movimiento. */
  speedLines(dir, n = 3) {
    for (let i = 0; i < n; i++) {
      this.lines.push({ x: rand(0, 1), y: rand(0.08, 0.85), len: rand(0.12, 0.35), dir, life: 0.22, max: 0.22 });
    }
  }

  update(dt) {
    const ps = this.parts;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life -= dt;
      if (p.life <= 0) {
        ps[i] = ps[ps.length - 1];
        ps.pop();
        continue;
      }
      if (p.vx !== undefined) {
        p.vy += (p.grav || 0) * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.type === 'chunk') {
          p.rot += p.vr * dt;
          if (p.y > 0 && p.vy > 0) {
            p.y = 0;
            p.vy *= -0.4;
            p.vx *= 0.6;
          }
        }
      }
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      t.y -= 40 * dt;
      if (t.life <= 0) this.texts.splice(i, 1);
    }
    for (let i = this.lines.length - 1; i >= 0; i--) {
      const l = this.lines[i];
      l.life -= dt;
      l.x -= l.dir * dt * 2.5;
      if (l.life <= 0) this.lines.splice(i, 1);
    }
    this.flashA = Math.max(0, this.flashA - dt * 3.2);
    this.dimT = Math.max(0, this.dimT - dt);
    const target = this.dimT > 0 ? 0.55 : 0;
    this.dimA += (target - this.dimA) * Math.min(1, dt * 14);
  }

  /** Efectos en espacio de mundo (dentro de la transformación de cámara). */
  draw(ctx) {
    for (const p of this.parts) {
      const k = p.life / p.max;
      switch (p.type) {
        case 'spark': {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size * k + 1;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035);
          ctx.stroke();
          break;
        }
        case 'dust': {
          ctx.globalAlpha = k * 0.8;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1.4 - k * 0.6), 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          break;
        }
        case 'glow': {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = k;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (0.4 + k * 0.6), 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';
          break;
        }
        case 'chunk': {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.globalAlpha = Math.min(1, k * 3);
          ctx.fillStyle = p.color;
          ctx.strokeStyle = OUTLINE;
          ctx.lineWidth = 1.5;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.strokeRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
          break;
        }
        case 'ring': {
          const r = p.size * (1 - k * k);
          ctx.globalAlpha = k;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2 + 8 * k;
          ctx.beginPath();
          if (p.flat) ctx.ellipse(p.x, p.y, r, r * 0.22, 0, 0, Math.PI * 2);
          else ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
          break;
        }
        case 'burst': {
          // Estrella de impacto estilo cómic
          const s = p.size * (1.25 - k * 0.6);
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.globalAlpha = Math.min(1, k * 2.5);
          star(ctx, 9, s, s * 0.45);
          ctx.fillStyle = p.color;
          ctx.fill();
          star(ctx, 9, s * 0.6, s * 0.28);
          ctx.fillStyle = '#fff';
          ctx.fill();
          ctx.restore();
          break;
        }
        case 'bolt': {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = k;
          ctx.lineJoin = 'miter';
          for (const [w, c] of [[9, p.color], [3, '#fff']]) {
            ctx.strokeStyle = c;
            ctx.lineWidth = w * k + 1;
            ctx.beginPath();
            p.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';
          break;
        }
      }
    }

    for (const t of this.texts) {
      const k = t.life / t.max;
      const pop = k > 0.8 ? 1 + (k - 0.8) * 4 : 1;
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(t.rot);
      ctx.scale(pop, pop);
      ctx.globalAlpha = Math.min(1, k * 3);
      ctx.font = `${t.size}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 9;
      ctx.strokeStyle = OUTLINE;
      ctx.strokeText(t.str, 0, 0);
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, 0, 0);
      ctx.restore();
    }
  }

  /** Oscurecimiento del fondo (se dibuja entre el escenario y los luchadores). */
  drawDim(ctx, view) {
    if (this.dimA < 0.01) return;
    ctx.fillStyle = `rgba(10,4,30,${this.dimA})`;
    ctx.fillRect(0, 0, view.w, view.h);
  }

  /** Efectos en espacio de pantalla. */
  drawScreen(ctx, view) {
    if (this.lines.length) {
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineCap = 'round';
      for (const l of this.lines) {
        ctx.globalAlpha = l.life / l.max;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(l.x * view.w, l.y * view.h);
        ctx.lineTo((l.x + l.len * l.dir) * view.w, l.y * view.h);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    if (this.flashA > 0.01) {
      ctx.globalAlpha = Math.min(1, this.flashA);
      ctx.fillStyle = this.flashC;
      ctx.fillRect(0, 0, view.w, view.h);
      ctx.globalAlpha = 1;
    }
  }
}

function star(ctx, points, outer, inner) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner : outer;
    const a = (i / (points * 2)) * Math.PI * 2;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
}
