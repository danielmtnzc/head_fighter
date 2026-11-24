// PIPO — alto, equilibrado, de cuerpo a cuerpo. Caricatura dibujada. Especial: rodillazo volador de acero.
export default {
  id: 'pipo',
  name: 'PIPO',
  tagline: 'Rodilla blindada',
  color: '#4f8fc0',
  groups: ['lps'],
  head: {
    type: 'drawn',
    size: 1,
    art: {
      skin: '#f3c8a4', hair: 'curtain', hairColor: '#6f4a30', hairColor2: '#a87a50', brows: '#4e3322', eye: '#7f9a6a',
      face: 'long', nose: 'long', eyeSize: 0.86, brow: 'soft', mustacheColor: '#4e3322', goateeColor: 'rgba(78,51,34,0.5)',
      extra: ['thickBrows', 'lids', 'goatee', 'thinMustache'],
    },
  },
  body: {
    shirt: '#2f3444', shorts: '#3d4a63', skin: '#f3c8a4', gloves: '#f3c8a4', shoes: '#e9edf2',
    detail: 'straps', detailColor: '#7d5560', scale: 1.04, width: 1, legs: 1.45,
  },
  stats: { health: 150, speed: 1, jump: 1, power: 1, weight: 1 },
  special: {
    name: 'Rodilla de acero',
    description: 'La rodilla se le vuelve de acero y se lanza a dar un rodillazo volador.',
    type: 'dash',
    damage: 20,
    cooldown: 8.5,
    params: {
      startup: 0.45, speed: 980, duration: 0.48, recovery: 0.38, reach: 66,
      poses: { charge: 'kneeWind', go: 'kneeFly', hit: 'kneeFly' },
      form: { body: { steelKnee: true } },
    },
    fx: { color: '#9fc3dd', color2: '#ffffff', text: '¡RODILLA DE ACERO!' },
    ai: { min: 110, max: 430 },
  },
};
