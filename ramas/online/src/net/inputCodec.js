// Mandos de un fotograma en 2 bytes: x como entero de -127 a 127 y los botones en 4 bits.
// Los botones son pulsaciones de ese fotograma, no "mantenido".
import { clamp } from '../config.js';

const BUTTONS = ['jump', 'punch', 'kick', 'special'];
export const NEUTRAL_CODE = 0;

/** Mandos → número de 16 bits (byte alto: x; byte bajo: botones). */
export function encodeInput(inp) {
  const x = Math.round(clamp(inp.x || 0, -1, 1) * 127);
  const bits = BUTTONS.reduce((acc, b, i) => (inp[b] ? acc | (1 << i) : acc), 0);
  return ((x & 0xff) << 8) | bits;
}

/** Número → mandos. El jugador local también juega con este valor redondeado. */
export function decodeInput(code) {
  const inp = { x: ((code >> 8) << 24 >> 24) / 127 };
  BUTTONS.forEach((b, i) => (inp[b] = !!(code & (1 << i))));
  return inp;
}
