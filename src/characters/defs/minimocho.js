// MINIMOCHO — ligero, de media distancia. Caricatura dibujada. Especial: chorro de vómito verde.
export default {
  id: 'minimocho',
  name: 'MiniMocho',
  tagline: 'No le sentó bien la cena',
  color: '#9bc53d',
  groups: ['lps'],
  head: {
    type: 'drawn',
    size: 1.02,
    art: {
      skin: '#efc3a0', hair: 'buzz', hairColor: '#2b211d', brows: '#231a16', eye: '#4a3220',
      face: 'long', nose: 'long', eyeSize: 0.82, brow: 'soft', extra: ['thickBrows', 'lids'],
    },
  },
  body: {
    shirt: '#f4f6f8', shorts: '#3a4250', skin: '#efc3a0', gloves: '#efc3a0', shoes: '#9bc53d',
    detail: null, scale: 1, build: 'normal', legs: 1,
  },
  stats: { health: 150, speed: 1.06, jump: 1.03, power: 1, weight: 0.96 },
  special: {
    name: 'Pota de ucraniana',
    description: 'Se pone verde, se le revuelve la tripa y suelta un chorro de pota.',
    type: 'spray',
    damage: 22,
    cooldown: 8,
    params: { startup: 0.42, duration: 0.5, recovery: 0.35, reach: 290, mouthX: 15, mouthY: -50, sickSkin: '#a9c77a' },
    fx: { color: '#9bc53d', color2: '#d6e86a', text: '¡POTA DE UCRANIANA!' },
    ai: { min: 60, max: 280 },
  },
};
