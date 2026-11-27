// ESPECIAL: CAÍDA DEL CIELO. El luchador grita una frase (bocadillo) y del cielo cae un
// edificio sobre la posición del rival. Una sombra avisa dónde caerá: se puede esquivar.
// Tras caer se queda un momento en el escenario (por detrás de los luchadores) y se va.
// params: startup, recovery, say (texto del bocadillo), fall (segundos de caída),
//         width, height (tamaño del golpe), stay (segundos en el suelo), building (de BUILDINGS),
//         sign (letrero)
import { STAGE, OUTLINE, FONT, clamp, rand } from '../../config.js';
import { specialHit } from './common.js';
import { sfx } from '../../engine/audio.js';

// ---------------------------------------------------------------- edificios

const box = (ctx, c, x, y, w, h) => {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);
};

/** Señora mayor de pie en la puerta (cabezona, como los luchadores). Pies en (0, 0). */
function drawGranny(ctx, t, wave) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = OUTLINE;
  // piernas y zapatillas
  box(ctx, '#e7c6a8', -9, -16, 6, 14);
  box(ctx, '#e7c6a8', 3, -16, 6, 14);
  box(ctx, '#3b2a4a', -12, -4, 10, 5);
  box(ctx, '#3b2a4a', 2, -4, 10, 5);
  // vestido negro y delantal
  ctx.beginPath();
  ctx.moveTo(-12, -58);
  ctx.lineTo(12, -58);
  ctx.lineTo(18, -14);
  ctx.lineTo(-18, -14);
  ctx.closePath();
  ctx.fillStyle = '#26212b';
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-8, -44);
  ctx.lineTo(8, -44);
  ctx.lineTo(11, -18);
  ctx.lineTo(-11, -18);
  ctx.closePath();
  ctx.fillStyle = '#f3efe6';
  ctx.fill();
  ctx.stroke();
  // brazo que saluda con el trapo y brazo en jarras
  const a = wave ? Math.sin(t * 14) * 0.35 : 0.2;
  ctx.save();
  ctx.translate(11, -54);
  ctx.rotate(-2.3 + a);
  ctx.lineWidth = 7;
  ctx.strokeStyle = OUTLINE;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(22, 0);
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#26212b';
  ctx.stroke();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = OUTLINE;
  ctx.beginPath();
  ctx.arc(24, 0, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = '#e7c6a8';
  ctx.fill();
  ctx.stroke();
  box(ctx, '#e9e2c9', 22, -14, 9, 13);
  ctx.restore();
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-11, -54);
  ctx.lineTo(-20, -40);
  ctx.lineTo(-11, -32);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#26212b';
  ctx.stroke();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = OUTLINE;
  // cabeza
  const hy = -80;
  ctx.beginPath();
  ctx.arc(9, hy - 22, 9, 0, Math.PI * 2); // moño
  ctx.fillStyle = '#c9cbd3';
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, hy, 22, 24, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#f0d2b8';
  ctx.fill();
  ctx.stroke();
  // pelo canoso
  ctx.beginPath();
  ctx.ellipse(0, hy - 9, 23, 17, 0, Math.PI, Math.PI * 2);
  ctx.quadraticCurveTo(6, hy - 16, -22, hy - 4);
  ctx.closePath();
  ctx.fillStyle = '#dfe1e8';
  ctx.fill();
  ctx.stroke();
  // gafas, mofletes, boca
  ctx.lineWidth = 2;
  for (const x of [-7, 9]) {
    ctx.beginPath();
    ctx.arc(x, hy + 1, 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(190,230,255,0.45)';
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, hy + 1, 1.8, 0, Math.PI * 2);
    ctx.fillStyle = OUTLINE;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(-1, hy + 1);
  ctx.lineTo(3, hy + 1);
  ctx.stroke();
  ctx.fillStyle = 'rgba(240,110,110,0.45)';
  for (const x of [-12, 15]) {
    ctx.beginPath();
    ctx.ellipse(x, hy + 10, 4.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(2, hy + 12, 5, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.restore();
}

export const BUILDINGS = {
  /** Bar de pueblo con letrero luminoso. Base centrada en (0, 0), unos 190 × 190. */
  bar: {
    draw(ctx, sign, t, landed) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = 3;
      ctx.strokeStyle = OUTLINE;
      // fachada
      box(ctx, '#f1e4c8', -92, -150, 184, 150);
      ctx.fillStyle = 'rgba(150,110,70,0.16)';
      ctx.fillRect(-90, -24, 180, 22);
      box(ctx, '#8b5a3c', -96, -6, 192, 7);
      // tejado
      ctx.beginPath();
      [[-104, -150], [104, -150], [90, -168], [-90, -168]].forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.closePath();
      ctx.fillStyle = '#b5482e';
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 1.5;
      for (let x = -84; x <= 84; x += 14) {
        ctx.beginPath();
        ctx.moveTo(x, -167);
        ctx.lineTo(x * 1.12, -151);
        ctx.stroke();
      }
      ctx.lineWidth = 3;
      ctx.strokeStyle = OUTLINE;
      // letrero luminoso
      const on = !landed || Math.sin(t * 9) > -0.6;
      box(ctx, '#1f3b2c', -78, -200, 156, 36);
      ctx.fillStyle = '#5b4632';
      ctx.fillRect(-60, -165, 5, 15);
      ctx.fillRect(55, -165, 5, 15);
      ctx.save();
      ctx.font = `30px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (on) {
        ctx.shadowColor = '#ffd23f';
        ctx.shadowBlur = 14;
      }
      ctx.fillStyle = on ? '#ffe27a' : '#9c8a4a';
      ctx.fillText(sign, 0, -181, 144);
      ctx.restore();
      // toldo a rayas
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        const x = -88 + i * 22;
        [[x, -132], [x + 22, -132], [x + 22, -116], [x + 11, -110], [x, -116]].forEach(([px, py]) => ctx.lineTo(px, py));
        ctx.closePath();
        ctx.fillStyle = i % 2 ? '#f4f6f8' : '#2f8a4f';
        ctx.fill();
        ctx.stroke();
      }
      // ventana con jarra de cerveza
      box(ctx, '#2b3550', -82, -96, 46, 54);
      ctx.fillStyle = 'rgba(255,220,120,0.35)';
      ctx.fillRect(-80, -94, 42, 50);
      ctx.beginPath();
      ctx.moveTo(-59, -96);
      ctx.lineTo(-59, -42);
      ctx.moveTo(-82, -70);
      ctx.lineTo(-36, -70);
      ctx.stroke();
      box(ctx, '#f6c445', -72, -66, 16, 20);
      box(ctx, '#ffffff', -73, -70, 18, 6);
      ctx.beginPath();
      ctx.arc(-55, -56, 5, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      // barril
      box(ctx, '#9c6334', 46, -38, 34, 36);
      ctx.fillStyle = '#5b4632';
      ctx.fillRect(46, -30, 34, 4);
      ctx.fillRect(46, -14, 34, 4);
      // puerta abierta con la señora
      box(ctx, '#3a2418', -26, -104, 56, 104);
      ctx.fillStyle = 'rgba(255,210,120,0.28)';
      ctx.fillRect(-23, -101, 50, 101);
      drawGranny(ctx, t, landed);
      box(ctx, '#7a4a2c', 30, -104, 12, 104);
    },
  },
};

// ---------------------------------------------------------------- edificio que cae

class FallingBuilding {
  constructor(owner, sp, x) {
    const p = sp.params;
    this.owner = owner;
    this.sp = sp;
    this.x = x;
    this.fallT = p.fall ?? 0.62;
    this.y = -900;
    this.t = 0;
    this.landT = -1;
    this.dangerous = true;
    this.dead = false;
    this.behind = false;
    this.art = BUILDINGS[p.building] || BUILDINGS.bar;
  }

  update(dt, world) {
    const p = this.sp.params;
    this.t += dt;
    if (this.landT < 0) {
      const k = Math.min(1, this.t / this.fallT);
      this.y = -900 * (1 - k * k);
      if (Math.random() < 0.5) world.fx.glow(this.x + rand(-80, 80), this.y - rand(0, 160), '#fff', rand(6, 12), 0.2);
      if (k >= 1) this.land(world);
      return;
    }
    const since = this.t - this.landT;
    if (since < 0.08) {
      const W = p.width ?? 190;
      const H = p.height ?? 200;
      const opp = world.opponentOf(this.owner);
      const dir = opp.x === this.x ? this.owner.facing : opp.x > this.x ? 1 : -1;
      world.tryHit(this.owner, opp, { x: this.x - W / 2, y: -H, w: W, h: H }, specialHit(this.sp, { dir, knockback: { x: 520, y: -700 } }));
    }
    if (since > (p.stay ?? 1.3)) this.dead = true;
  }

  land(world) {
    this.landT = this.t;
    this.y = 0;
    this.behind = true;
    this.dangerous = false;
    world.camera.shake(22);
    world.fx.flash('#fff', 0.25);
    world.fx.ring(this.x, 0, this.sp.fx?.color2 || '#f6c445', 260, 0.45, true);
    world.fx.dust(this.x - 90, 0, 10, -1);
    world.fx.dust(this.x + 90, 0, 10, 1);
    world.fx.debris(this.x, -10, 14, '#b5482e', 560);
    if (!world.silent) sfx.boom();
  }

  draw(ctx) {
    const p = this.sp.params;
    // sombra que crece mientras cae
    if (this.landT < 0) {
      const k = Math.min(1, this.t / this.fallT);
      ctx.save();
      ctx.fillStyle = `rgba(20,10,30,${0.15 + 0.35 * k})`;
      ctx.beginPath();
      ctx.ellipse(this.x, 2, 40 + 60 * k, 8 + 6 * k, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    const since = this.landT < 0 ? 0 : this.t - this.landT;
    const left = (p.stay ?? 1.3) - since;
    ctx.save();
    ctx.globalAlpha = clamp(left / 0.35, 0, 1);
    ctx.translate(this.x, this.y);
    // aplastamiento al tocar el suelo
    const squash = this.landT >= 0 && since < 0.18 ? Math.sin((since / 0.18) * Math.PI) * 0.12 : 0;
    ctx.scale(1 + squash, 1 - squash);
    this.art.draw(ctx, p.sign || '', this.t, this.landT >= 0);
    ctx.restore();
  }
}

// ---------------------------------------------------------------- tipo

export default {
  start(f, sp, world, a) {
    a.s.dropped = false;
  },
  update(f, sp, world, dt, a) {
    const p = sp.params;
    if (!a.s.dropped && a.t >= p.startup) {
      a.s.dropped = true;
      const opp = world.opponentOf(f);
      const x = clamp(opp.x, STAGE.left + 60, STAGE.right - 60);
      world.spawn(new FallingBuilding(f, sp, x));
    }
    return a.t >= p.startup + p.recovery;
  },
  pose(f, a, sp) {
    return a.t < sp.params.startup ? 'callWind' : 'callGo';
  },
};
