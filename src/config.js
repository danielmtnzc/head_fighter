// Constantes globales del juego. Todo en unidades lógicas (la vista mide 540 de alto).
export const VIEW_H = 540;
export const STEP = 1 / 60; // paso fijo de simulación
export const GRAVITY = 2700;
export const ROUND_TIME = 99;

// Escenario: límites laterales (x) y margen visual que deja la cámara por fuera.
export const STAGE = { left: -520, right: 520, margin: 190 };

// Caja de colisión común de los luchadores (el origen está en los pies).
export const BODY = { halfW: 30, height: 122, minDist: 80 };

export const BASE_SPEED = 330;
export const BASE_JUMP = 980;

export const OUTLINE = '#1a1026';
export const FONT = "'Bangers', Impact, 'Arial Black', sans-serif";

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
export const approach = (v, target, d) => (v < target ? Math.min(v + d, target) : Math.max(v - d, target));
