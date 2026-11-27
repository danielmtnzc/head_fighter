// Bocadillo de diálogo sobre la cabeza de un luchador (lo usan varios especiales).
import { OUTLINE, FONT } from '../../config.js';

export class SpeechBubble {
  constructor(owner, text, life = 1.3) {
    this.owner = owner;
    this.text = text;
    this.t = 0;
    this.life = life;
    this.dead = false;
  }

  update(dt) {
    this.t += dt;
    if (this.t >= this.life) this.dead = true;
  }

  draw(ctx) {
    const f = this.owner;
    const pop = Math.min(1, this.t / 0.12);
    const fade = Math.min(1, (this.life - this.t) / 0.2);
    const top = (88 + 40 * (f.cfg.head.size || 1) + ((f.cfg.body.legs || 1) - 1) * 21) * (f.cfg.body.scale || 1);
    ctx.save();
    ctx.globalAlpha = Math.max(0, fade);
    // por encima del nombre del golpe, que sale sobre la cabeza
    ctx.translate(f.x + f.facing * 40, f.y - top - 118);
    ctx.scale(0.6 + 0.4 * pop, 0.6 + 0.4 * pop);
    ctx.font = `26px ${FONT}`;
    const w = ctx.measureText(this.text).width + 30;
    const h = 44;
    const dir = f.facing;
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = OUTLINE;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 16);
    ctx.moveTo(-dir * 18, h / 2 - 2);
    ctx.lineTo(-dir * 34, h / 2 + 22);
    ctx.lineTo(-dir * 2, h / 2 - 2);
    ctx.fill();
    ctx.stroke();
    // tapa el trazo del borde donde nace la cola
    ctx.beginPath();
    ctx.moveTo(-dir * 16, h / 2 - 3);
    ctx.lineTo(-dir * 4, h / 2 - 3);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.fillStyle = OUTLINE;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.text, 0, 2);
    ctx.restore();
  }
}
