// ÑAÑI — alto y con buena puntería. Caricatura dibujada. Especial de tipo escopeta.
export default {
  id: 'nani',
  name: 'ÑAÑI',
  tagline: 'Puntería de escopeta de feria',
  color: '#e8702a',
  groups: ['lps', 'quinta'],
  head: {
    type: 'drawn',
    size: 1,
    art: {
      skin: '#f3c6a2', hair: 'quiff', hairColor: '#7b4425', hairColor2: '#b06a3a', brows: '#57301b', eye: '#6b3f1f',
      face: 'long', nose: 'long', smile: 'teeth', eyeSize: 0.86, brow: 'soft', extra: ['thickBrows', 'earring', 'dimples'],
    },
  },
  body: {
    shirt: '#2b2733', shorts: '#2b2733', skin: '#f3c6a2', gloves: '#f3c6a2', shoes: '#4a2f22',
    detail: 'beca', detailColor: '#e8702a', scale: 1.04, width: 0.95, legs: 1.45,
  },
  stats: { health: 148, speed: 1, jump: 1.02, power: 1, weight: 1 },
  special: {
    name: 'Disparo de escopeta de feria',
    description: 'Saca la escopeta de la caseta, apunta y suelta un taponazo.',
    type: 'shotgun',
    damage: 20,
    cooldown: 8,
    params: { startup: 0.5, recovery: 0.45, speed: 1350, radius: 14 },
    fx: { color: '#ff9f45', color2: '#fff3a8', text: '¡PREMIO!' },
    ai: { min: 140, max: 800 },
  },
};
