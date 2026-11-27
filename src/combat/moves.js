// Ataques básicos comunes a todos los personajes.
// Tiempos en segundos: startup (preparación) → active (zona de impacto viva) → recovery.
// hitbox relativa a los pies del atacante, mirando a +x.
export const MOVES = {
  punch: {
    startup: 0.07, active: 0.09, recovery: 0.15, lunge: 150,
    hitbox: { x: 16, y: -72, w: 70, h: 40 },
    hit: { damage: 6, knockback: { x: 400, y: 0 }, hitstun: 0.24, hitstop: 0.06, shake: 3, power: 1 },
  },
  kick: {
    startup: 0.15, active: 0.11, recovery: 0.25, lunge: 110,
    hitbox: { x: 16, y: -86, w: 88, h: 58 },
    hit: { damage: 10, knockback: { x: 520, y: -210 }, hitstun: 0.34, hitstop: 0.09, shake: 7, power: 2 },
  },
};
