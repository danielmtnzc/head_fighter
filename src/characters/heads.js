// Sistema de cabezas, independiente del cuerpo.
// Una cabeza puede ser:
//   { type: 'image', src: 'assets/heads/pepe.png', shape: 'oval'|'circle', size, zoom, offsetX, offsetY, mirror }
//   { type: 'armor', size }  yelmo de hierro (transformaciones)
//   { type: 'drawn', art: { ...estilo paramétrico... }, size }
// drawHead dibuja centrado en (0,0), mirando hacia +x. El motor se encarga de
// colocarla, inclinarla y voltearla según la animación.
import { OUTLINE } from '../config.js';

const cache = new Map();

function getImage(src) {
  let e = cache.get(src);
  if (!e) {
    const img = new Image();
    e = { img, ok: false };
    img.onload = () => (e.ok = true);
    img.onerror = () => console.warn(`[heads] No se pudo cargar la cabeza: ${src}`);
    img.src = src;
    cache.set(src, e);
  }
  return e;
}

/** Precarga las imágenes de cabeza de una lista de personajes. */
export function preloadHeads(roster) {
  for (const c of roster) if (c.head?.type === 'image' && c.head.src) getImage(c.head.src);
}

const DEFAULT_ART = { skin: '#f2c79b', hair: 'short', hairColor: '#4a3728' };

/**
 * @param r     radio base de la cabeza en unidades de dibujo
 * @param expr  'idle' | 'attack' | 'hurt' | 'ko' | 'win'
 * @param t     tiempo de animación (parpadeo)
 * @param facing 1 / -1 (solo afecta a imágenes con mirror:false)
 */
export function drawHead(ctx, cfg, r, expr = 'idle', t = 0, facing = 1) {
  const head = cfg.head || {};
  const R = r * (head.size || 1);
  if (head.type === 'image' && head.src) {
    const e = getImage(head.src);
    if (e.ok) return drawImageHead(ctx, R, head, cfg.color, e.img, facing);
  }
  if (head.type === 'armor') return drawArmorHead(ctx, R, expr);
  drawDrawnHead(ctx, R, head.art || DEFAULT_ART, expr, t);
}

// ---------------------------------------------------------------- Imagen

function drawImageHead(ctx, r, head, color, img, facing) {
  const rx = r * (head.shape === 'circle' ? 1 : 0.9);
  const ry = r;
  const path = () => {
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  };
  ctx.save();
  path();
  ctx.fillStyle = '#d8d8e0';
  ctx.fill();
  ctx.clip();
  if (head.mirror === false && facing < 0) ctx.scale(-1, 1);
  // "cover": rellena el óvalo manteniendo proporciones
  const s = Math.max((2 * rx) / img.width, (2 * ry) / img.height) * (head.zoom || 1);
  const w = img.width * s;
  const h = img.height * s;
  ctx.drawImage(img, -w / 2 + (head.offsetX || 0) * r, -h / 2 + (head.offsetY || 0) * r, w, h);
  ctx.restore();
  path();
  ctx.lineWidth = r * 0.17;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
  ctx.lineWidth = r * 0.07;
  ctx.strokeStyle = color || '#fff';
  ctx.stroke();
}

// ---------------------------------------------------------------- Yelmo

function drawArmorHead(ctx, r, expr) {
  const lw = Math.max(1.5, r * 0.075);
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = lw;
  ctx.strokeStyle = OUTLINE;
  // penacho
  ctx.beginPath();
  poly(ctx, r, [[0.1, -0.95], [-0.1, -1.4], [-0.5, -1.45], [-0.95, -1.15], [-1.2, -0.6], [-0.9, -0.75], [-0.6, -0.8]]);
  ctx.closePath();
  fillStroke(ctx, '#8b5cf6');
  // cubo de hierro
  ctx.beginPath();
  poly(ctx, r, [[-0.82, -0.5]]);
  ctx.quadraticCurveTo(-r * 0.75, -r * 1.06, 0, -r * 1.06);
  ctx.quadraticCurveTo(r * 0.8, -r * 1.06, r * 0.88, -r * 0.5);
  poly(ctx, r, [[0.98, 0.1], [0.82, 0.8], [0.3, 1.02], [-0.66, 0.86], [-0.88, 0.1]]);
  ctx.closePath();
  fillStroke(ctx, '#7d8799');
  ctx.save();
  ctx.clip();
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(-r, -r * 1.1, r * 0.5, r * 2.2);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.ellipse(r * 0.1, -r * 0.78, r * 0.4, r * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // refuerzos de cobre
  ctx.beginPath();
  poly(ctx, r, [[-0.88, -0.5], [0.92, -0.5], [0.96, -0.28], [-0.9, -0.28]]);
  ctx.closePath();
  fillStroke(ctx, '#b87333');
  ctx.beginPath();
  poly(ctx, r, [[0.2, -0.28], [0.44, -0.28], [0.42, 0.98], [0.24, 1.0]]);
  ctx.closePath();
  fillStroke(ctx, '#b87333');
  // rendijas de los ojos, encendidas
  for (const [x0, x1, s] of [[-0.35, 0.14, 1], [0.5, 0.86, -1]]) {
    const tilt = expr === 'hurt' ? -0.08 : 0.08;
    ctx.beginPath();
    poly(ctx, r, [[x0, -0.06 - tilt * s], [x1, -0.06 + tilt * s], [x1, 0.18], [x0, 0.18]]);
    ctx.closePath();
    fillStroke(ctx, '#8dff6a');
  }
  // respiradero
  for (const x of [-0.2, 0, 0.58, 0.74]) {
    ctx.beginPath();
    ctx.moveTo(x * r, r * 0.45);
    ctx.lineTo(x * r, r * 0.72);
    ctx.stroke();
  }
  // remaches
  ctx.fillStyle = OUTLINE;
  for (const x of [-0.7, -0.3, 0.1, 0.5, 0.78]) {
    ctx.beginPath();
    ctx.arc(x * r, -r * 0.39, r * 0.045, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- Dibujada

function poly(ctx, r, pts) {
  // lineTo en un trazo vacío equivale a moveTo, así se puede encadenar con arcos
  pts.forEach(([x, y]) => ctx.lineTo(x * r, y * r));
}

function fillStroke(ctx, fill) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.stroke();
}

function drawDrawnHead(ctx, r, art, expr, t) {
  const rx = r * (art.wide || 0.96);
  const ry = r;
  const lw = Math.max(1.5, r * 0.075);
  const hairC = art.hairColor || '#4a3728';
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = lw;

  // --- pelo por detrás
  if (art.hair === 'pigtails') {
    for (const [x, y, rot] of [[-1.0, -0.6, -0.6], [0.58, -1.08, 0.5]]) {
      ctx.beginPath();
      ctx.ellipse(x * r, y * r, r * 0.3, r * 0.48, rot, 0, Math.PI * 2);
      fillStroke(ctx, hairC);
    }
  }
  if (art.extra?.includes('headband')) {
    // colas del nudo
    ctx.beginPath();
    poly(ctx, r, [[-0.9, -0.42], [-1.45, -0.3], [-1.3, -0.52], [-1.5, -0.7], [-0.9, -0.55]]);
    ctx.closePath();
    fillStroke(ctx, art.extraColor || '#e63946');
  }

  // --- oreja
  ctx.beginPath();
  if (art.face === 'long') ctx.ellipse(-rx * 0.9, r * 0.06, r * 0.2, r * 0.29, -0.15, 0, Math.PI * 2);
  else ctx.arc(-rx * 0.88, r * 0.1, r * 0.2, 0, Math.PI * 2);
  fillStroke(ctx, art.skin);
  if (art.extra?.includes('earring')) {
    // aro con colgante
    const ex = -rx;
    ctx.beginPath();
    ctx.arc(ex, r * 0.44, r * 0.1, 0, Math.PI * 2);
    ctx.moveTo(ex, r * 0.54);
    ctx.lineTo(ex, r * 0.66);
    ctx.lineWidth = lw * 1.5;
    ctx.stroke();
    ctx.strokeStyle = '#eef3f8';
    ctx.lineWidth = lw * 0.7;
    ctx.stroke();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = lw;
  }

  // --- cráneo
  const headPath = () => {
    ctx.beginPath();
    if (art.face === 'long') {
      // cara alargada con mandíbula marcada
      ctx.moveTo(-r * 0.84, -r * 0.3);
      ctx.bezierCurveTo(-r * 0.85, -r * 1.2, r * 0.9, -r * 1.2, r * 0.9, -r * 0.3);
      ctx.bezierCurveTo(r * 0.9, r * 0.3, r * 0.86, r * 0.62, r * 0.66, r * 0.86);
      ctx.bezierCurveTo(r * 0.46, r * 1.12, r * 0.02, r * 1.14, -r * 0.2, r * 0.98);
      ctx.bezierCurveTo(-r * 0.6, r * 0.72, -r * 0.82, r * 0.4, -r * 0.84, -r * 0.3);
      ctx.closePath();
    } else ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  };
  headPath();
  fillStroke(ctx, art.skin);

  // sombreado suave y barba, recortados a la cabeza
  ctx.save();
  headPath();
  ctx.clip();
  ctx.fillStyle = 'rgba(0,0,0,0.10)';
  ctx.beginPath();
  ctx.ellipse(-rx * 0.75, r * 0.35, rx * 0.7, ry * 1.1, 0.3, 0, Math.PI * 2);
  ctx.fill();
  if (art.extra?.includes('goatee')) {
    // perilla incipiente
    ctx.fillStyle = art.goateeColor || 'rgba(60,38,28,0.22)';
    ctx.beginPath();
    ctx.ellipse(r * 0.28, r * 0.98, r * 0.34, r * 0.17, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (art.extra?.includes('stubble')) {
    // sombra de barba de pocos días
    ctx.fillStyle = 'rgba(50,30,25,0.12)';
    ctx.beginPath();
    ctx.ellipse(r * 0.26, r * 0.8, r * 0.95, r * 0.58, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (art.hair === 'quiff' || art.hair === 'crop' || art.hair === 'fringe' || art.hair === 'buzz') {
    // degradado rapado de las sienes
    const g = ctx.createLinearGradient(0, -r * 0.65, 0, r * 0.12);
    g.addColorStop(0, hairC);
    g.addColorStop(1, hairC + '00');
    ctx.fillStyle = g;
    ctx.beginPath();
    poly(ctx, r, [[-1, -0.9], [-0.4, -0.75], [-0.46, -0.3], [-0.58, -0.2], [-0.6, 0.18], [-1, 0.18]]);
    ctx.closePath();
    ctx.fill();
  }
  if (art.extra?.includes('beard')) {
    ctx.fillStyle = art.beardColor || hairC;
    ctx.beginPath();
    ctx.ellipse(r * 0.22, r * 0.86, r * 0.95, r * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (art.extra?.includes('headband')) {
    ctx.fillStyle = art.extraColor || '#e63946';
    ctx.strokeStyle = OUTLINE;
    ctx.save();
    ctx.rotate(-0.06);
    ctx.fillRect(-r * 1.2, -r * 0.6, r * 2.4, r * 0.22);
    ctx.lineWidth = lw * 0.7;
    ctx.strokeRect(-r * 1.2, -r * 0.6, r * 2.4, r * 0.22);
    ctx.restore();
  }
  ctx.restore();
  ctx.lineWidth = lw;
  ctx.strokeStyle = OUTLINE;

  // --- pelo por delante
  switch (art.hair) {
    case 'spikes':
      ctx.beginPath();
      poly(ctx, r, [
        [-0.98, -0.1], [-1.28, -0.48], [-0.94, -0.52], [-1.05, -0.98], [-0.62, -0.84], [-0.48, -1.38],
        [-0.16, -1.0], [0.2, -1.42], [0.36, -0.97], [0.82, -1.16], [0.74, -0.72], [1.06, -0.6], [0.84, -0.36],
      ]);
      ctx.bezierCurveTo(r * 0.45, -r * 0.62, -r * 0.4, -r * 0.7, -r * 0.8, -r * 0.3);
      ctx.closePath();
      fillStroke(ctx, hairC);
      break;
    case 'flame': {
      const pts = [
        [-0.8, -0.5], [-1.0, -1.02], [-0.6, -0.92], [-0.52, -1.52], [-0.16, -1.14], [0.1, -1.72],
        [0.32, -1.14], [0.68, -1.42], [0.62, -0.9], [0.94, -0.92], [0.74, -0.48],
      ];
      ctx.beginPath();
      poly(ctx, r, pts);
      ctx.quadraticCurveTo(0, -r * 0.8, -r * 0.8, -r * 0.5);
      ctx.closePath();
      fillStroke(ctx, hairC);
      // llama interior
      ctx.save();
      ctx.translate(0, -r * 0.3);
      ctx.scale(0.55, 0.62);
      ctx.beginPath();
      poly(ctx, r, pts);
      ctx.quadraticCurveTo(0, -r * 0.8, -r * 0.8, -r * 0.5);
      ctx.closePath();
      ctx.fillStyle = art.hairColor2 || '#ffd23f';
      ctx.fill();
      ctx.restore();
      break;
    }
    case 'pigtails':
      ctx.beginPath();
      ctx.ellipse(0, 0, rx * 1.04, ry * 1.04, 0, Math.PI * 1.0, Math.PI * 1.93);
      poly(ctx, r, [[0.78, -0.32], [0.52, -0.54], [0.3, -0.26], [0.04, -0.52], [-0.22, -0.28], [-0.52, -0.5], [-0.84, -0.14]]);
      ctx.closePath();
      fillStroke(ctx, hairC);
      for (const [x, y] of [[-0.8, -0.72], [0.5, -0.9]]) {
        ctx.beginPath();
        ctx.arc(x * r, y * r, r * 0.11, 0, Math.PI * 2);
        fillStroke(ctx, art.extraColor || '#ffd23f');
      }
      break;
    case 'quiff': {
      // tupé con volumen peinado hacia arriba
      ctx.beginPath();
      poly(ctx, r, [[-0.84, -0.44]]);
      for (const [cx, cy, x, y] of [
        [-1.1, -0.8, -0.92, -1.06], [-0.86, -1.3, -0.56, -1.3], [-0.4, -1.52, -0.08, -1.42],
        [0.16, -1.6, 0.42, -1.42], [0.76, -1.48, 0.86, -1.2], [1.14, -1.06, 0.98, -0.78],
      ]) ctx.quadraticCurveTo(cx * r, cy * r, x * r, y * r);
      poly(ctx, r, [[0.88, -0.5], [0.74, -0.7], [0.5, -0.6], [0.34, -0.74], [0.1, -0.62], [-0.1, -0.74], [-0.34, -0.6], [-0.5, -0.36]]);
      ctx.quadraticCurveTo(-r * 0.7, -r * 0.5, -r * 0.84, -r * 0.44);
      ctx.closePath();
      fillStroke(ctx, hairC);
      // mechones
      ctx.strokeStyle = art.hairColor2 || 'rgba(255,255,255,0.3)';
      ctx.lineWidth = lw * 1.1;
      for (const [x0, y0, cx, cy, x1, y1] of [
        [-0.66, -0.72, -0.78, -0.98, -0.6, -1.14], [-0.34, -0.82, -0.4, -1.12, -0.18, -1.26],
        [0.02, -0.86, 0.0, -1.16, 0.24, -1.3], [0.36, -0.9, 0.38, -1.14, 0.6, -1.24], [0.68, -0.86, 0.72, -1.0, 0.82, -1.04],
      ]) {
        ctx.beginPath();
        ctx.moveTo(x0 * r, y0 * r);
        ctx.quadraticCurveTo(cx * r, cy * r, x1 * r, y1 * r);
        ctx.stroke();
      }
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = lw;
      break;
    }
    case 'fringe': {
      // pelo corto texturizado, con flequillo hacia delante
      ctx.beginPath();
      poly(ctx, r, [[-0.86, -0.2], [-1.0, -0.62]]);
      for (const [cx, cy, x, y] of [
        [-1.0, -0.98, -0.74, -1.04], [-0.6, -1.3, -0.3, -1.2], [0.0, -1.36, 0.24, -1.22],
        [0.56, -1.28, 0.7, -1.04], [1.0, -0.96, 1.0, -0.6],
      ]) ctx.quadraticCurveTo(cx * r, cy * r, x * r, y * r);
      poly(ctx, r, [[0.92, -0.26], [0.82, -0.52], [0.66, -0.44], [0.54, -0.58], [0.34, -0.46], [0.2, -0.6], [0.0, -0.48], [-0.16, -0.6], [-0.4, -0.46], [-0.56, -0.2]]);
      ctx.quadraticCurveTo(-r * 0.7, -r * 0.3, -r * 0.86, -r * 0.2);
      ctx.closePath();
      fillStroke(ctx, hairC);
      ctx.strokeStyle = art.hairColor2 || 'rgba(255,255,255,0.25)';
      ctx.lineWidth = lw * 0.9;
      for (const [x, y] of [[-0.66, -0.66], [-0.36, -0.76], [-0.06, -0.8], [0.24, -0.8], [0.52, -0.76], [0.76, -0.68]]) {
        ctx.beginPath();
        ctx.moveTo((x - 0.12) * r, (y - 0.2) * r);
        ctx.quadraticCurveTo((x + 0.02) * r, (y - 0.16) * r, (x + 0.04) * r, y * r);
        ctx.stroke();
      }
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = lw;
      break;
    }
    case 'curtain': {
      // media melena corta con raya, peinada hacia los lados
      ctx.beginPath();
      poly(ctx, r, [[-0.92, 0.02]]);
      for (const [cx, cy, x, y] of [
        [-1.2, -0.5, -0.92, -0.9], [-0.66, -1.34, -0.1, -1.22], [0.2, -1.42, 0.56, -1.14], [1.12, -1.0, 1.06, -0.4], [1.06, -0.12, 0.92, 0.0],
      ]) ctx.quadraticCurveTo(cx * r, cy * r, x * r, y * r);
      for (const [cx, cy, x, y] of [[0.92, -0.5, 0.62, -0.62], [0.36, -0.72, 0.16, -0.98], [0.0, -0.6, -0.34, -0.5], [-0.62, -0.36, -0.66, 0.04]])
        ctx.quadraticCurveTo(cx * r, cy * r, x * r, y * r);
      ctx.closePath();
      fillStroke(ctx, hairC);
      ctx.strokeStyle = art.hairColor2 || 'rgba(255,255,255,0.3)';
      ctx.lineWidth = lw;
      for (const [x0, y0, cx, cy, x1, y1] of [
        [0.06, -1.06, -0.3, -0.9, -0.6, -0.56], [-0.1, -1.1, -0.62, -0.96, -0.82, -0.46], [0.3, -1.04, 0.62, -0.92, 0.8, -0.6], [0.42, -1.1, 0.86, -0.94, 0.94, -0.46],
      ]) {
        ctx.beginPath();
        ctx.moveTo(x0 * r, y0 * r);
        ctx.quadraticCurveTo(cx * r, cy * r, x1 * r, y1 * r);
        ctx.stroke();
      }
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = lw;
      break;
    }
    case 'buzz':
      // pelo muy corto, pegado al cráneo
      ctx.beginPath();
      poly(ctx, r, [[-0.86, -0.3]]);
      ctx.bezierCurveTo(-r * 0.95, -r * 1.22, r * 1.0, -r * 1.22, r * 0.92, -r * 0.42);
      for (const [cx, cy, x, y] of [[0.8, -0.62, 0.5, -0.64], [0.1, -0.7, -0.36, -0.6], [-0.5, -0.46, -0.56, -0.2]])
        ctx.quadraticCurveTo(cx * r, cy * r, x * r, y * r);
      ctx.quadraticCurveTo(-r * 0.7, -r * 0.3, -r * 0.86, -r * 0.3);
      ctx.closePath();
      fillStroke(ctx, hairC);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.ellipse(r * 0.1, -r * 0.84, r * 0.42, r * 0.09, 0.03, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'crop': {
      // pelo corto y tupido, algo levantado por delante
      ctx.beginPath();
      poly(ctx, r, [[-0.84, -0.4]]);
      for (const [cx, cy, x, y] of [[-1.0, -0.86, -0.7, -1.06], [-0.3, -1.3, 0.2, -1.22], [0.62, -1.26, 0.84, -0.96], [1.0, -0.78, 0.9, -0.46]])
        ctx.quadraticCurveTo(cx * r, cy * r, x * r, y * r);
      poly(ctx, r, [[0.8, -0.58], [0.6, -0.64], [0.44, -0.58], [0.24, -0.66], [0.02, -0.58], [-0.18, -0.66], [-0.4, -0.56], [-0.5, -0.3]]);
      ctx.quadraticCurveTo(-r * 0.7, -r * 0.46, -r * 0.84, -r * 0.4);
      ctx.closePath();
      fillStroke(ctx, hairC);
      ctx.strokeStyle = art.hairColor2 || 'rgba(255,255,255,0.25)';
      ctx.lineWidth = lw * 0.9;
      for (const [x, y] of [[-0.56, -0.8], [-0.26, -0.9], [0.06, -0.94], [0.36, -0.94], [0.64, -0.84]]) {
        ctx.beginPath();
        ctx.moveTo(x * r, y * r);
        ctx.lineTo((x + 0.1) * r, (y - 0.14) * r);
        ctx.stroke();
      }
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = lw;
      break;
    }
    case 'bald':
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.ellipse(-r * 0.2, -r * 0.62, r * 0.3, r * 0.12, -0.35, 0, Math.PI * 2);
      ctx.fill();
      break;
    default: // 'short'
      ctx.beginPath();
      ctx.ellipse(0, 0, rx * 1.04, ry * 1.04, 0, Math.PI * 1.0, Math.PI * 1.9);
      ctx.bezierCurveTo(r * 0.4, -r * 0.5, -r * 0.4, -r * 0.62, -r * 0.86, -r * 0.1);
      ctx.closePath();
      fillStroke(ctx, hairC);
  }

  drawFace(ctx, r, art, expr, t, lw, hairC);
  ctx.restore();
}

function drawFace(ctx, r, art, expr, t, lw, hairC) {
  const ey = -r * 0.08;
  const eyes = [
    { x: r * 0.0, w: r * 0.17, front: false },
    { x: r * 0.52, w: r * 0.15, front: true },
  ];
  const eh = r * 0.22 * (art.eyeSize || 1);
  for (const e of eyes) e.w *= art.eyeSize || 1;
  const blink = expr === 'idle' && t % 3.4 > 3.28;
  const browC = art.brows || OUTLINE;

  if (art.extra?.includes('cheeks')) {
    ctx.fillStyle = 'rgba(255,90,120,0.35)';
    for (const [x, y] of [[-0.2, 0.32], [0.7, 0.3]]) {
      ctx.beginPath();
      ctx.ellipse(x * r, y * r, r * 0.15, r * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (art.extra?.includes('freckles')) {
    ctx.fillStyle = 'rgba(120,60,30,0.55)';
    for (const [x, y] of [[-0.22, 0.22], [-0.1, 0.3], [-0.3, 0.32], [0.66, 0.22], [0.76, 0.3], [0.58, 0.31]]) {
      ctx.beginPath();
      ctx.arc(x * r, y * r, r * 0.028, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- ojos
  ctx.lineWidth = lw * 0.9;
  ctx.strokeStyle = OUTLINE;
  for (const e of eyes) {
    const s = e.front ? -1 : 1; // los ojos "apretados" apuntan hacia el centro
    if (expr === 'hurt') {
      ctx.beginPath();
      ctx.moveTo(e.x - e.w * s, ey - eh * 0.6);
      ctx.lineTo(e.x + e.w * 0.7 * s, ey);
      ctx.lineTo(e.x - e.w * s, ey + eh * 0.6);
      ctx.stroke();
    } else if (expr === 'ko') {
      ctx.beginPath();
      ctx.moveTo(e.x - e.w, ey - eh * 0.6);
      ctx.lineTo(e.x + e.w, ey + eh * 0.6);
      ctx.moveTo(e.x + e.w, ey - eh * 0.6);
      ctx.lineTo(e.x - e.w, ey + eh * 0.6);
      ctx.stroke();
    } else if (expr === 'win') {
      ctx.beginPath();
      ctx.arc(e.x, ey + r * 0.08, e.w, Math.PI * 1.12, Math.PI * 1.88);
      ctx.stroke();
    } else if (blink) {
      ctx.beginPath();
      ctx.moveTo(e.x - e.w, ey);
      ctx.lineTo(e.x + e.w, ey);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.ellipse(e.x, ey, e.w, eh, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.lineWidth = lw * 0.6;
      ctx.stroke();
      ctx.lineWidth = lw * 0.9;
      const px = e.x + e.w * 0.3;
      const py = ey + (expr === 'attack' ? 0 : r * 0.03);
      const pr = expr === 'attack' ? r * 0.075 : r * 0.1;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fillStyle = art.eye || '#3a2a1a';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px, py, pr * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = '#120a1c';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px - pr * 0.3, py - pr * 0.4, pr * 0.28, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    }
    if (art.extra?.includes('lids') && expr === 'idle' && !blink) {
      // párpado algo caído: mirada tranquila
      ctx.beginPath();
      ctx.ellipse(e.x, ey, e.w, eh, 0, Math.PI * 1.1, Math.PI * 1.9);
      ctx.closePath();
      fillStroke(ctx, art.skin);
    }
    if (art.extra?.includes('lashes') && expr !== 'hurt' && expr !== 'ko') {
      ctx.lineWidth = lw * 0.6;
      ctx.beginPath();
      ctx.moveTo(e.x - e.w * 0.9, ey - eh * 0.7);
      ctx.lineTo(e.x - e.w * 1.5, ey - eh * 1.15);
      ctx.moveTo(e.x - e.w * 0.4, ey - eh * 0.95);
      ctx.lineTo(e.x - e.w * 0.7, ey - eh * 1.5);
      ctx.stroke();
      ctx.lineWidth = lw * 0.9;
    }
  }

  // --- cejas
  const thick = art.extra?.includes('thickBrows') ? 1.7 : 1;
  ctx.strokeStyle = browC;
  ctx.lineWidth = lw * 1.1 * thick;
  for (const e of eyes) {
    const inner = e.front ? -1 : 1; // lado interior de la ceja
    let yIn = -0.34;
    let yOut = -0.4;
    if (expr === 'attack') [yIn, yOut] = [-0.24, -0.46];
    else if (expr === 'hurt' || expr === 'ko') [yIn, yOut] = [-0.46, -0.3];
    else if (expr === 'win') [yIn, yOut] = [-0.46, -0.44];
    else if (expr === 'idle' && art.brow === 'soft') [yIn, yOut] = [-0.33, -0.31];
    else if (expr === 'idle') [yIn, yOut] = [-0.3, -0.4];
    ctx.beginPath();
    ctx.moveTo(e.x + e.w * 1.1 * inner, ey + yIn * r);
    ctx.lineTo(e.x - e.w * 1.1 * inner, ey + yOut * r);
    ctx.stroke();
  }
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = lw * 0.8;

  // --- nariz
  ctx.beginPath();
  if (art.nose === 'long') {
    ctx.moveTo(r * 0.3, -r * 0.06);
    ctx.quadraticCurveTo(r * 0.4, r * 0.14, r * 0.44, r * 0.24);
    ctx.quadraticCurveTo(r * 0.42, r * 0.36, r * 0.24, r * 0.31);
  } else ctx.arc(r * 0.3, r * 0.17, r * 0.075, -Math.PI * 0.55, Math.PI * 0.6);
  ctx.stroke();

  // --- boca
  const mx = r * 0.3;
  const my = r * (art.face === 'long' ? 0.63 : 0.52);
  const dark = '#4a0f1e';
  if (expr === 'attack') {
    ctx.beginPath();
    ctx.ellipse(mx, my, r * 0.23, r * 0.19, 0, 0, Math.PI * 2);
    ctx.fillStyle = dark;
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#fff';
    ctx.fillRect(mx - r * 0.3, my - r * 0.22, r * 0.6, r * 0.1);
    ctx.fillStyle = '#ff7a90';
    ctx.beginPath();
    ctx.ellipse(mx, my + r * 0.2, r * 0.16, r * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.ellipse(mx, my, r * 0.23, r * 0.19, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (expr === 'hurt') {
    ctx.beginPath();
    ctx.ellipse(mx, my + r * 0.02, r * 0.12, r * 0.16, 0, 0, Math.PI * 2);
    fillStroke(ctx, dark);
  } else if (expr === 'ko') {
    ctx.beginPath();
    ctx.moveTo(mx - r * 0.26, my);
    ctx.quadraticCurveTo(mx - r * 0.13, my - r * 0.1, mx, my);
    ctx.quadraticCurveTo(mx + r * 0.13, my + r * 0.1, mx + r * 0.26, my);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(mx + r * 0.1, my + r * 0.11, r * 0.09, r * 0.13, 0, 0, Math.PI * 2);
    fillStroke(ctx, '#ff7a90');
  } else if (expr === 'win') {
    ctx.beginPath();
    ctx.moveTo(mx - r * 0.3, my - r * 0.1);
    ctx.lineTo(mx + r * 0.3, my - r * 0.1);
    ctx.quadraticCurveTo(mx, my + r * 0.42, mx - r * 0.3, my - r * 0.1);
    ctx.closePath();
    ctx.fillStyle = dark;
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#fff';
    ctx.fillRect(mx - r * 0.3, my - r * 0.1, r * 0.6, r * 0.09);
    ctx.restore();
    ctx.stroke();
  } else if (art.smile === 'teeth') {
    // sonrisa amplia enseñando los dientes
    ctx.beginPath();
    ctx.moveTo(mx - r * 0.36, my - r * 0.12);
    ctx.quadraticCurveTo(mx, my - r * 0.02, mx + r * 0.34, my - r * 0.14);
    ctx.quadraticCurveTo(mx + r * 0.06, my + r * 0.36, mx - r * 0.36, my - r * 0.12);
    ctx.closePath();
    fillStroke(ctx, '#fff');
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = 'rgba(26,16,38,0.25)';
    ctx.lineWidth = lw * 0.35;
    for (const x of [-0.2, -0.1, 0, 0.1, 0.2]) {
      ctx.beginPath();
      ctx.moveTo(mx + x * r, my - r * 0.2);
      ctx.lineTo(mx + x * r, my + r * 0.3);
      ctx.stroke();
    }
    ctx.restore();
  } else {
    ctx.beginPath();
    ctx.moveTo(mx - r * 0.24, my - r * 0.02);
    ctx.quadraticCurveTo(mx + r * 0.02, my + r * 0.14, mx + r * 0.24, my - r * 0.08);
    ctx.stroke();
  }

  // --- extras sobre la cara
  if (art.extra?.includes('mole')) {
    ctx.fillStyle = '#6b4028';
    for (const [x, y] of [[-0.3, 0.3], [-0.12, 0.5]]) {
      ctx.beginPath();
      ctx.arc(x * r, y * r, r * 0.022, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (art.extra?.includes('dimples') && expr !== 'hurt' && expr !== 'ko') {
    ctx.strokeStyle = 'rgba(120,60,30,0.6)';
    ctx.lineWidth = lw * 0.6;
    ctx.beginPath();
    ctx.arc(mx - r * 0.36, my - r * 0.1, r * 0.12, Math.PI * 0.75, Math.PI * 1.25);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(mx + r * 0.34, my - r * 0.12, r * 0.12, -Math.PI * 0.25, Math.PI * 0.25);
    ctx.stroke();
    ctx.strokeStyle = OUTLINE;
  }
  if (art.extra?.includes('thinMustache')) {
    // bigote fino
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = art.mustacheColor || hairC;
    ctx.lineWidth = lw * 1.1;
    ctx.beginPath();
    ctx.moveTo(mx - r * 0.24, my - r * 0.13);
    ctx.quadraticCurveTo(mx - r * 0.08, my - r * 0.24, mx + r * 0.02, my - r * 0.19);
    ctx.quadraticCurveTo(mx + r * 0.12, my - r * 0.25, mx + r * 0.26, my - r * 0.15);
    ctx.stroke();
    ctx.restore();
  }
  if (art.extra?.includes('mustache')) {
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(mx + s * r * 0.2, my - r * 0.17 + (s > 0 ? -r * 0.02 : 0), r * 0.25, r * 0.1, s * 0.35, 0, Math.PI * 2);
      fillStroke(ctx, art.mustacheColor || hairC);
    }
  }
  if (art.extra?.includes('glasses')) {
    ctx.lineWidth = lw;
    for (const e of eyes) {
      ctx.beginPath();
      ctx.ellipse(e.x, ey, e.w * 1.5, eh * 1.3, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(180,230,255,0.25)';
      ctx.fill();
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(eyes[0].x + eyes[0].w * 1.5, ey);
    ctx.lineTo(eyes[1].x - eyes[1].w * 1.5, ey);
    ctx.stroke();
  }
}
