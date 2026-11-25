// Dibuja un luchador por piezas (cabeza, torso, brazos, piernas) a partir de su pose.
// La cabeza se delega en heads.js, así puede ser un dibujo o una fotografía.
import { OUTLINE } from '../config.js';
import { drawHead } from './heads.js';
import { buildOf } from './builds.js';

// Esqueleto base (unidades lógicas, origen en los pies, mirando a +x)
const SK = {
  shoulderF: [7, -45], shoulderB: [-7, -46],
  hipF: [6, -24], hipB: [-6, -24],
  upper: 13, fore: 12, thigh: 11, shin: 10,
  head: [3, -88], headR: 40,
};

/** Desplaza un hombro o cadera hacia fuera según la complexión. */
const spread = (pt, d) => [pt[0] + Math.sign(pt[0]) * d, pt[1]];

function limb(o, a1, a2, l1, l2, st) {
  const jx = o[0] + Math.sin(a1) * l1 * st;
  const jy = o[1] + Math.cos(a1) * l1 * st;
  return [jx, jy, jx + Math.sin(a1 + a2) * l2 * st, jy + Math.cos(a1 + a2) * l2 * st];
}

function strokeLimb(ctx, o, pts, w, c1, c2) {
  const [jx, jy, ex, ey] = pts;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = w + 5;
  ctx.beginPath();
  ctx.moveTo(o[0], o[1]);
  ctx.lineTo(jx, jy);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  ctx.lineWidth = w;
  ctx.strokeStyle = c2;
  ctx.beginPath();
  ctx.moveTo(jx, jy);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  ctx.strokeStyle = c1;
  ctx.beginPath();
  ctx.moveTo(o[0], o[1]);
  ctx.lineTo(jx, jy);
  ctx.stroke();
}

function drawArm(ctx, o, a, st, body) {
  const pts = limb(o, a[0], a[1], SK.upper, SK.fore, st);
  const { arm } = buildOf(body);
  strokeLimb(ctx, o, pts, 9 * arm, body.shirt, body.skin);
  const r = 9.5 * (1 + (arm - 1) * 0.35) * (1 + (st - 1) * 0.3);
  ctx.beginPath();
  ctx.arc(pts[2], pts[3], r, 0, Math.PI * 2);
  ctx.fillStyle = body.gloves;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(pts[2] - r * 0.3, pts[3] - r * 0.35, r * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fill();
}

/** Alargamiento extra de las piernas (body.legs: 1 = normal). */
const legExtra = (body) => (body.legs || 1) - 1;

function drawLeg(ctx, o, a, st, body, steel = false) {
  const pts = limb(o, a[0], a[1], SK.thigh, SK.shin, st + legExtra(body));
  strokeLimb(ctx, o, pts, 10 * buildOf(body).leg, body.shorts, body.skin);
  if (steel) {
    // rodillera de acero, con brillo
    ctx.lineCap = 'round';
    for (const [w, c] of [[20, OUTLINE], [15, '#8794a3']]) {
      ctx.lineWidth = w;
      ctx.strokeStyle = c;
      ctx.beginPath();
      ctx.moveTo((o[0] + pts[0]) / 2, (o[1] + pts[1]) / 2);
      ctx.lineTo(pts[0], pts[1]);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(pts[0], pts[1], 15, 0, Math.PI * 2);
    ctx.fillStyle = '#c3ced9';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(pts[0] - 4, pts[1] - 6, 6, 3.2, -0.6, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  }
  const k = 1 + (st - 1) * 0.16;
  ctx.save();
  ctx.translate(pts[2], pts[3]);
  ctx.rotate(-(a[0] + a[1]));
  ctx.scale(k, k);
  ctx.beginPath();
  ctx.ellipse(4, 2, 12, 7.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = body.shoes;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-5, 6.5);
  ctx.lineTo(13, 6.5);
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Contorno de la camiseta: pecho arriba, cintura abajo y barriga hacia delante. */
function shirtPath(ctx, hw, ww, belly) {
  const top = -58;
  const bot = -28 + belly * 0.4;
  const r = 9;
  ctx.beginPath();
  ctx.moveTo(-hw + r, top);
  ctx.lineTo(hw - r, top);
  ctx.quadraticCurveTo(hw, top, hw, top + r);
  if (belly) ctx.bezierCurveTo(hw + belly * 0.4, -48, ww + belly * 1.3, -36, ww, bot - 2);
  else ctx.lineTo(ww, bot - r);
  ctx.quadraticCurveTo(ww, bot, ww - r, bot);
  ctx.lineTo(-ww + r, bot);
  ctx.quadraticCurveTo(-ww, bot, -ww, bot - (belly ? 4 : r));
  if (belly) ctx.bezierCurveTo(-ww - belly * 0.5, -38, -hw, -48, -hw, top + r);
  else ctx.lineTo(-hw, top + r);
  ctx.quadraticCurveTo(-hw, top, -hw + r, top);
  ctx.closePath();
}

function drawTorso(ctx, body) {
  const b = buildOf(body);
  const w = 18 * (body.width || 1);
  const hw = w * b.chest; // pecho
  const ww = w * b.waist; // cintura
  const full = Math.max(hw, ww) + b.belly; // anchura que cubre todo el torso
  ctx.lineWidth = 3;
  ctx.strokeStyle = OUTLINE;
  roundRect(ctx, -ww, -36, ww * 2, 16, 6);
  ctx.fillStyle = body.shorts;
  ctx.fill();
  ctx.stroke();
  shirtPath(ctx, hw + 1, ww + 1, b.belly);
  ctx.fillStyle = body.shirt;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // detalle del pecho
  ctx.fillStyle = body.detailColor || 'rgba(255,255,255,0.85)';
  switch (body.detail) {
    case 'stripe':
      ctx.fillRect(-full, -42, full * 2, 5);
      break;
    case 'bolt':
      ctx.beginPath();
      [[4, -53], [-3, -43], [2, -43], [-2, -33], [8, -46], [3, -46]].forEach(([x, y]) => ctx.lineTo(x + 2, y + 1));
      ctx.closePath();
      ctx.fill();
      break;
    case 'star':
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 3.2 : 7.5;
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        ctx.lineTo(3 + Math.cos(a) * r, -42 + Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      break;
    case 'flame':
      ctx.beginPath();
      ctx.moveTo(3, -52);
      ctx.quadraticCurveTo(11, -42, 4, -34);
      ctx.quadraticCurveTo(-5, -38, -1, -45);
      ctx.quadraticCurveTo(2, -44, 3, -52);
      ctx.fill();
      break;
    case 'straps':
      // jersey de punto y tirantes de mochila
      ctx.strokeStyle = 'rgba(255,255,255,0.13)';
      ctx.lineWidth = 1.5;
      for (const y of [-52, -47, -42, -37, -32]) {
        ctx.beginPath();
        ctx.moveTo(-full, y);
        ctx.lineTo(full, y);
        ctx.stroke();
      }
      ctx.fillStyle = body.detailColor;
      ctx.fillRect(-hw + 3, -57, 6, 28);
      ctx.fillRect(hw - 8, -57, 6, 28);
      break;
    case 'cross': {
      // americana, camisa blanca abierta y colgante de cruz
      const tri = (c, pts) => {
        ctx.beginPath();
        pts.forEach(([x, y]) => ctx.lineTo(x, y));
        ctx.closePath();
        ctx.fillStyle = c;
        ctx.fill();
      };
      tri('#f4f7fb', [[-8, -57], [16, -57], [5, -30], [3, -30]]);
      tri(body.skin, [[-2, -57], [10, -57], [4, -40]]);
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(1.5, -47, 5, 12);
      ctx.fillRect(-1, -44.5, 10, 5);
      ctx.fillStyle = body.detailColor;
      ctx.fillRect(2.8, -46, 2.4, 10);
      ctx.fillRect(0.2, -43.2, 7.6, 2.4);
      break;
    }
    case 'blazer': {
      // americana abierta y camisa blanca con el cuello desabrochado
      const tri = (c, pts) => {
        ctx.beginPath();
        pts.forEach(([x, y]) => ctx.lineTo(x, y));
        ctx.closePath();
        ctx.fillStyle = c;
        ctx.fill();
      };
      tri('#f4f7fb', [[-8, -57], [16, -57], [8, -24], [0, -24]]);
      tri(body.skin, [[-1, -57], [9, -57], [4, -44]]);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(4, -44);
      ctx.lineTo(4, -24);
      ctx.stroke();
      if (body.detailColor) {
        tri(body.detailColor, [[-8, -57], [-3, -57], [2, -36], [-2, -40]]);
        tri(body.detailColor, [[16, -57], [11, -57], [6, -36], [10, -40]]);
      }
      break;
    }
    case 'beca': {
      // camisa, corbata y beca de graduación en V
      const tri = (c, pts) => {
        ctx.beginPath();
        pts.forEach(([x, y]) => ctx.lineTo(x, y));
        ctx.closePath();
        ctx.fillStyle = c;
        ctx.fill();
      };
      tri('#ffffff', [[-5, -57], [13, -57], [4, -40]]);
      tri(body.tieColor || '#17131c', [[2, -57], [6, -57], [7, -43], [4, -38], [1, -43]]);
      tri(body.detailColor, [[-hw + 2, -57], [-5, -57], [4, -38], [13, -57], [hw - 2, -57], [4, -30]]);
      break;
    }
    case 'heart':
      ctx.beginPath();
      ctx.moveTo(3, -36);
      ctx.bezierCurveTo(-8, -44, -3, -52, 3, -46);
      ctx.bezierCurveTo(9, -52, 14, -44, 3, -36);
      ctx.fill();
      break;
  }
  ctx.restore();
  shirtPath(ctx, hw + 1, ww + 1, b.belly);
  ctx.lineWidth = 3;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
}

/** Dibuja el cuerpo completo en el origen (pies en 0,0). */
function drawBody(ctx, f) {
  const p = f.pose;
  const body = f.look.body;
  const s = body.scale || 1;
  const build = buildOf(body);
  const shoulderF = spread(SK.shoulderF, build.shoulder);
  const shoulderB = spread(SK.shoulderB, build.shoulder);
  const hipF = spread(SK.hipF, build.hip);
  const hipB = spread(SK.hipB, build.hip);
  ctx.save();
  ctx.scale(f.facing * s * p.sx, s * p.sy);

  const legF = limb(hipF, p.lf[0], p.lf[1], SK.thigh, SK.shin, p.lsF + legExtra(body));
  const legB = limb(hipB, p.lb[0], p.lb[1], SK.thigh, SK.shin, p.lsB + legExtra(body));
  // El pie más bajo se apoya en el suelo (salvo en el aire o tumbado)
  let ground = f.onGround ? 0 : -legExtra(body) * (SK.thigh + SK.shin);
  if (f.onGround) {
    const lowest = Math.max(legF[3], legB[3]) + 6;
    ground = -lowest * Math.max(0, 1 - Math.abs(p.rot) * 1.2);
  }
  ctx.translate(0, p.dy + ground);
  ctx.translate(0, -24);
  ctx.rotate(p.rot);
  ctx.translate(0, 24);

  const torso = () => {
    ctx.translate(0, -24);
    ctx.rotate(p.lean);
    ctx.translate(0, 24);
  };

  ctx.save();
  torso();
  drawArm(ctx, shoulderB, p.ab, p.asB, body);
  ctx.restore();

  drawLeg(ctx, hipB, p.lb, p.lsB, body);
  drawLeg(ctx, hipF, p.lf, p.lsF, body, body.steelKnee);

  ctx.save();
  torso();
  drawTorso(ctx, body);
  ctx.save();
  ctx.translate(SK.head[0] + p.headX, SK.head[1] + p.headY);
  ctx.rotate(p.headTilt);
  drawHead(ctx, f.look, SK.headR, f.expression(), f.animT, f.facing);
  ctx.restore();
  const a = f.action;
  if (a?.handler?.prop) {
    const hand = limb(shoulderF, p.af[0], p.af[1], SK.upper, SK.fore, p.asF);
    ctx.save();
    ctx.translate(hand[2], hand[3]);
    ctx.rotate(Math.PI / 2 - p.af[0] - p.af[1]);
    a.handler.prop(ctx, f, a, a.sp);
    ctx.restore();
  }
  drawArm(ctx, shoulderF, p.af, p.asF, body);
  ctx.restore();

  ctx.restore();
}

// Lienzo auxiliar para el destello blanco al recibir un golpe
let off = null;
let octx = null;
const OFF = { size: 380, ox: 190, oy: 300, res: 2 };

function drawFlashed(ctx, f) {
  if (!off) {
    off = document.createElement('canvas');
    off.width = off.height = OFF.size * OFF.res;
    octx = off.getContext('2d');
  }
  octx.setTransform(1, 0, 0, 1, 0, 0);
  octx.globalCompositeOperation = 'source-over';
  octx.clearRect(0, 0, off.width, off.height);
  octx.setTransform(OFF.res, 0, 0, OFF.res, OFF.ox * OFF.res, OFF.oy * OFF.res);
  drawBody(octx, f);
  octx.setTransform(1, 0, 0, 1, 0, 0);
  octx.globalCompositeOperation = 'source-atop';
  octx.fillStyle = 'rgba(255,255,255,0.9)';
  octx.fillRect(0, 0, off.width, off.height);
  ctx.drawImage(off, -OFF.ox, -OFF.oy, OFF.size, OFF.size);
}

export function drawFighter(ctx, f) {
  ctx.save();
  ctx.translate(f.x, f.y);
  if (f.flashT > 0) drawFlashed(ctx, f);
  else drawBody(ctx, f);
  ctx.restore();

  // estrellitas de K.O. (tumbado) o de mareo (girando sobre la cabeza)
  const ko = f.state === 'ko' && f.onGround;
  const dizzy = f.dizzyT > 0 && f.state !== 'ko';
  if (ko || dizzy) {
    const b = f.cfg.body;
    const top = (88 + 40 * (f.cfg.head.size || 1) + ((b.legs || 1) - 1) * 21) * (b.scale || 1);
    const cx = ko ? f.x - f.facing * 66 : f.x;
    const cy = ko ? -96 : f.y - top - 22;
    for (let i = 0; i < 3; i++) {
      const a = f.animT * (ko ? 4 : 6) + (i * Math.PI * 2) / 3;
      const x = cx + Math.cos(a) * 30;
      const y = cy + Math.sin(a) * 8;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ctx.beginPath();
      for (let j = 0; j < 10; j++) {
        const r = j % 2 ? 3 : 7;
        const b = (j / 10) * Math.PI * 2;
        ctx.lineTo(Math.cos(b) * r, Math.sin(b) * r);
      }
      ctx.closePath();
      ctx.fillStyle = '#ffd23f';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = OUTLINE;
      ctx.stroke();
      ctx.restore();
    }
  }
}

/** Sombra en el suelo y aura cuando el especial está cargado. */
export function drawShadow(ctx, f) {
  const k = Math.max(0.35, 1 - -f.y / 320);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(f.x, 3, 36 * k, 8 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  if (f.energy >= 100 && f.state !== 'ko') {
    const pulse = 0.5 + Math.sin(f.animT * 8) * 0.25;
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = f.cfg.special.fx?.color || f.cfg.color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(f.x, 3, 46, 11, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

/** Dibuja un personaje posando (menús, retratos de cuerpo entero). */
export function drawFighterPreview(ctx, f, x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  drawBody(ctx, f);
  ctx.restore();
}
