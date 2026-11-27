// Objetos dibujados que pueden lanzar los proyectiles (params.item).
// draw(ctx): centrado en el origen y de pie, unos 56 de alto.
// grip: distancia del centro al punto de agarre (arriba).
// shards: colores de los trozos al romperse.
import { OUTLINE } from '../../config.js';

export const ITEMS = {
  bottle: {
    grip: 20,
    shards: ['#1f6b35', '#3f9b4f', '#5a3214', '#c8f0d0'],
    draw(ctx) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = OUTLINE;
      // vidrio
      ctx.beginPath();
      [[-4, -24], [4, -24], [4, -12], [13, -4], [13, 28], [-13, 28], [-13, -4], [-4, -12]].forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.closePath();
      ctx.fillStyle = '#1f6b35';
      ctx.fill();
      ctx.stroke();
      // tapón y etiqueta
      for (const [c, x, y, w, h] of [['#d9a441', -5, -29, 10, 8], ['#f08a24', -13, 2, 26, 19]]) {
        ctx.fillStyle = c;
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
      }
      ctx.fillStyle = '#3a1d08';
      ctx.font = "900 8px 'Arial Black', sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('JAGER', 0, 12, 22);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillRect(-9, -3, 3, 4);
      ctx.fillRect(-2, -18, 2, 8);
    },
  },
};
