// Utilidades compartidas por los tipos de especial.

/** Golpe base de un especial; cada tipo lo ajusta y special.params.hit lo puede sobrescribir. */
export function specialHit(sp, over = {}) {
  return {
    damage: sp.damage,
    knockback: { x: 560, y: -430 },
    hitstun: 0.45,
    hitstop: 0.13,
    shake: 13,
    power: 3,
    color: sp.fx?.color,
    text: sp.fx?.text,
    special: true,
    ...over,
    ...(sp.params?.hit || {}),
  };
}
