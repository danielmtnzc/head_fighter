// ESCENARIO: "La Azotea" — una azotea al atardecer con público cabezón.
// Un escenario expone drawBackground (espacio de pantalla, con capas en paralaje)
// y drawFloor (espacio de mundo, dentro de la cámara). Todo es procedural y sustituible.
import { STAGE, FONT, OUTLINE } from '../config.js';

// Generador pseudoaleatorio con semilla: el decorado es siempre el mismo.
function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function skyline(seed, minH, maxH) {
  const r = rng(seed);
  const out = [];
  let x = -1700;
  while (x < 1700) {
    const w = 60 + r() * 90;
    const h = minH + r() * (maxH - minH);
    const wins = [];
    for (let wy = 14; wy < h - 14; wy += 22) {
      for (let wx = 10; wx < w - 14; wx += 18) if (r() < 0.32) wins.push([wx, wy]);
    }
    out.push({ x, w, h, wins, antenna: r() < 0.3 });
    x += w + r() * 14;
  }
  return out;
}

const FAR = skyline(7, 90, 230);
const NEAR = skyline(21, 60, 170);

const crowdRng = rng(99);
const CROWD = [];
for (let x = -1500; x < 1500; x += 34 + crowdRng() * 16) {
  CROWD.push({
    x, r: 15 + crowdRng() * 8, row: crowdRng() < 0.5 ? 0 : 1, ph: crowdRng() * 6, sp: 3 + crowdRng() * 4,
    c: ['#3c096c', '#5a189a', '#240046', '#7b2cbf', '#9d4edd'][Math.floor(crowdRng() * 5)],
  });
}
const BULBS = ['#ffd23f', '#ff5d8f', '#7df9ff', '#b9fbc0'];

function layer(ctx, view, cam, p, fn) {
  const z = 1 + (cam.zoom - 1) * p;
  ctx.save();
  ctx.translate(view.w / 2 - cam.x * p * z + cam.sx * p, view.groundY - cam.y * z * p + cam.sy * p);
  ctx.scale(z, z);
  fn();
  ctx.restore();
}

function buildings(ctx, list, color, winColor) {
  for (const b of list) {
    ctx.fillStyle = color;
    ctx.fillRect(b.x, -b.h, b.w, b.h + 4);
    if (b.antenna) ctx.fillRect(b.x + b.w * 0.5, -b.h - 26, 3, 26);
    ctx.fillStyle = winColor;
    for (const [wx, wy] of b.wins) ctx.fillRect(b.x + wx, -b.h + wy, 8, 10);
  }
}

export default {
  id: 'azotea',
  name: 'La Azotea',

  drawBackground(ctx, view, cam, t) {
    // cielo
    const g = ctx.createLinearGradient(0, 0, 0, view.groundY);
    g.addColorStop(0, '#160a35');
    g.addColorStop(0.45, '#5a189a');
    g.addColorStop(0.8, '#ff5d8f');
    g.addColorStop(1, '#ffb347');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, view.w, view.h);

    // sol retro
    layer(ctx, view, cam, 0.04, () => {
      const sg = ctx.createLinearGradient(0, -330, 0, -40);
      sg.addColorStop(0, '#fff3b0');
      sg.addColorStop(1, '#ff5d8f');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(0, -170, 150, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,93,143,0.55)';
      for (let i = 0; i < 5; i++) ctx.fillRect(-160, -150 + i * 28, 320, 5 + i * 2.5);
    });

    layer(ctx, view, cam, 0.12, () => buildings(ctx, FAR, '#4a1a7a', 'rgba(255,210,63,0.5)'));
    layer(ctx, view, cam, 0.28, () => buildings(ctx, NEAR, '#2a0a52', '#ffd23f'));

    // guirnaldas de luces
    layer(ctx, view, cam, 0.55, () => {
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2;
      for (let x = -1400; x < 1400; x += 280) {
        ctx.fillStyle = '#1a0933';
        ctx.fillRect(x - 4, -250, 8, 250);
        ctx.beginPath();
        ctx.moveTo(x, -246);
        ctx.quadraticCurveTo(x + 140, -180, x + 280, -246);
        ctx.stroke();
        for (let i = 1; i < 8; i++) {
          const k = i / 8;
          const bx = x + 280 * k;
          const by = -246 + 132 * k * (1 - k);
          const on = Math.sin(t * 3 + i + x) > -0.3;
          ctx.fillStyle = BULBS[(i + Math.abs(x / 280)) % 4 | 0];
          ctx.globalAlpha = on ? 1 : 0.45;
          ctx.beginPath();
          ctx.arc(bx, by + 6, 5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    });

    // público tras el muro
    layer(ctx, view, cam, 0.78, () => {
      for (const row of [1, 0]) {
        for (const c of CROWD) {
          if (c.row !== row) continue;
          const bob = Math.abs(Math.sin(t * c.sp + c.ph)) * 9;
          const y = -70 - row * 20 - c.r * 0.6 - bob;
          ctx.fillStyle = c.c;
          ctx.beginPath();
          ctx.arc(c.x, y, c.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(c.x - c.r * 0.6, y + c.r * 0.7, c.r * 1.2, 30);
        }
      }
      // muro con carteles
      ctx.fillStyle = '#12052b';
      ctx.fillRect(-1700, -70, 3400, 80);
      ctx.fillStyle = '#ff5d8f';
      ctx.fillRect(-1700, -70, 3400, 5);
      ctx.font = `30px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let x = -1200, i = 0; x <= 1200; x += 400, i++) {
        ctx.fillStyle = i % 2 ? '#ffd23f' : '#7df9ff';
        ctx.globalAlpha = 0.85;
        ctx.fillText(i % 2 ? '★ LA QUINTA DEL BUITRE ★' : '¡DALE DURO!', x, -32);
      }
      ctx.globalAlpha = 1;
    });
  },

  drawFloor(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, 220);
    g.addColorStop(0, '#4b2e83');
    g.addColorStop(0.12, '#3a2168');
    g.addColorStop(1, '#150829');
    ctx.fillStyle = g;
    ctx.fillRect(-2400, 0, 4800, 600);
    // borde luminoso
    ctx.fillStyle = '#b388ff';
    ctx.fillRect(-2400, 0, 4800, 4);
    // marcas de pista en falsa perspectiva
    ctx.strokeStyle = 'rgba(255,255,255,0.13)';
    ctx.lineWidth = 3;
    for (let x = -2000; x <= 2000; x += 160) {
      ctx.beginPath();
      ctx.moveTo(x, 4);
      ctx.lineTo(x * 1.35, 300);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.ellipse(0, 46, 190, 30, 0, 0, Math.PI * 2);
    ctx.stroke();
    for (const y of [22, 74, 150]) {
      ctx.beginPath();
      ctx.moveTo(-2400, y);
      ctx.lineTo(2400, y);
      ctx.stroke();
    }
    // postes de neón: límites de la arena
    for (const s of [-1, 1]) {
      const x = s > 0 ? STAGE.right + 8 : STAGE.left - 20;
      ctx.fillStyle = '#12052b';
      ctx.fillRect(x, -170, 12, 172);
      ctx.fillStyle = '#7df9ff';
      ctx.fillRect(x + 3, -164, 6, 150);
      ctx.fillStyle = 'rgba(125,249,255,0.18)';
      ctx.fillRect(x - 6, -170, 24, 172);
    }
  },
};
