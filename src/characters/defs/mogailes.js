// MOGAILES — equilibrado, a distancia. Caricatura dibujada. Especial: llegan sus primos en tromba.
export default {
  id: 'mogailes',
  name: 'Mogailes',
  tagline: 'Con los primos no se juega',
  color: '#3d6bff',
  groups: ['lps'],
  head: {
    type: 'drawn',
    size: 1,
    art: {
      skin: '#f2c3a2', hair: 'bangs', hairColor: '#40291e', hairColor2: '#6d4a36', brows: '#3a251b', eye: '#6fa3c4',
      face: 'long', nose: 'long', smile: 'flat', eyeSize: 0.84, brow: 'soft', extra: ['thickBrows', 'lids', 'stubble', 'mole', 'hoop', 'earbud'],
    },
  },
  body: {
    shirt: '#1d2740', shorts: '#2a2f3a', skin: '#f2c3a2', gloves: '#f2c3a2', shoes: '#e9edf2',
    detail: 'straps', detailColor: '#0f1218', scale: 0.97, build: 'normal', legs: 0.95,
  },
  stats: { health: 150, speed: 1.03, jump: 1.02, power: 1, weight: 0.98 },
  special: {
    name: 'Paliza de las 600',
    description: 'Silba y sus primos llegan corriendo a repartir en tromba.',
    type: 'gang',
    damage: 22,
    cooldown: 8.5,
    params: {
      startup: 0.5, recovery: 0.4, speed: 760, gap: 26, behind: 170, finisher: 0.35,
      crew: [
        { art: { hair: 'crop', extra: ['thickBrows'] }, body: { shirt: '#d63c3c', detail: 'stripe', detailColor: '#ffffff', scale: 1, legs: 1.2 } },
        { art: { hair: 'quiff', smile: 'teeth', extra: ['thickBrows', 'thinMustache'] }, body: { shirt: '#f4f6f8', detail: null, scale: 0.88 } },
        { art: { hair: 'buzz', extra: ['thickBrows', 'beard'] }, body: { shirt: '#2fa36b', detail: null, scale: 1.1, width: 1.25 } },
        { art: { hair: 'curtain', extra: ['thickBrows'] }, body: { shirt: '#f2a93b', detail: 'stripe', detailColor: '#1d2740', scale: 0.92, legs: 1.1 } },
        { art: { hair: 'fringe', extra: ['glasses'] }, body: { shirt: '#7a4fc0', detail: null, scale: 0.8 } },
        { art: { hair: 'short', extra: ['thickBrows', 'mustache'] }, body: { shirt: '#5b3a2a', detail: null, scale: 1.02, width: 1.15 } },
        { art: { hair: 'bald', extra: ['thickBrows', 'beard'] }, body: { shirt: '#16181d', detail: 'star', detailColor: '#ffd23f', scale: 1.18, width: 1.3 } },
      ],
    },
    fx: { color: '#3d6bff', color2: '#ffd23f', text: '¡PRIMOS!' },
    ai: { min: 60, max: 600 },
  },
};
