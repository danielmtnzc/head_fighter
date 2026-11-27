// ZELAKING — altura media, medio-relleno. Caricatura dibujada: melena ondulada con cinta negra,
// bigote y perilla, sudadera roja con capucha. Especial: le da una calada al cigarro y echa humo verde.
export default {
  id: 'zelaking',
  name: 'Zelaking',
  tagline: 'Una calada y te nubla',
  color: '#b8e62e',
  groups: ['quinta'],
  head: {
    type: 'drawn',
    size: 1,
    art: {
      skin: '#e6b994', hair: 'wavy', hairColor: '#2e211a', hairColor2: 'rgba(255,255,255,0.18)', brows: '#17110e', eye: '#3a2618',
      face: 'long', nose: 'long', smile: 'flat', eyeSize: 0.85, brow: 'soft',
      extra: ['sweatband', 'thickBrows', 'lids', 'stubble', 'goatee', 'mustache'],
      bandColor: '#121215', mustacheColor: '#1c1512', goateeColor: 'rgba(28,20,16,0.5)',
    },
  },
  body: {
    shirt: '#d8262f', shorts: '#2a2d36', skin: '#e6b994', gloves: '#e6b994', shoes: '#f1f3f6',
    detail: 'hoodie', detailColor: '#c6f432', scale: 1, build: 'medioRelleno', legs: 1,
  },
  stats: { health: 160, speed: 1, jump: 0.98, power: 1.05, weight: 1.06 },
  special: {
    name: 'La Calada del Rey',
    description: 'Le da una calada larga al cigarro y echa una nube de humo verde que marea.',
    type: 'smoke',
    damage: 22,
    cooldown: 7.5,
    params: {
      say: 'Espera, una caladita...',
      startup: 0.7, duration: 0.55, recovery: 0.35, reach: 320, mouthX: 30, mouthY: -60, cloudH: 70, dizzy: 1,
    },
    fx: { color: '#6fd65a', color2: '#c4f59a', text: '¡HUMAZO!' },
    ai: { min: 60, max: 310 },
  },
};
