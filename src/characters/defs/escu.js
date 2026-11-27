// ESCU — medio, gordo y resistente. Caricatura dibujada. Especial: le cae del cielo el bar El Carmen al rival.
export default {
  id: 'escu',
  name: 'Escu',
  tagline: '¿Una cerveza en El Carmen?',
  color: '#c9184a',
  groups: ['lps'],
  head: {
    type: 'drawn',
    size: 1,
    art: {
      skin: '#f0c4a0', hair: 'pomp', hairColor: '#231815', hairColor2: '#46332b', brows: '#1c1210', eye: '#4a2c18',
      wide: 1.04, smile: 'teeth', eyeSize: 0.84, brow: 'soft', beardColor: '#2e211c', mustacheColor: '#2e211c',
      extra: ['thickBrows', 'beard', 'thinMustache'],
    },
  },
  body: {
    shirt: '#5f646e', shorts: '#3a3e47', skin: '#f0c4a0', gloves: '#f0c4a0', shoes: '#2a1d18',
    detail: 'blazer', detailColor: '#4b5059', scale: 1, build: 'gordo', legs: 1,
  },
  stats: { health: 160, speed: 0.94, jump: 0.95, power: 1.04, weight: 1.12 },
  special: {
    name: 'Ronda de pollos',
    description: 'Grita «¡Cerveza en El Carmen!» y del cielo cae el bar encima del rival.',
    type: 'skyDrop',
    damage: 21,
    cooldown: 8.5,
    params: {
      startup: 0.55, recovery: 0.4, say: '¡Cerveza en El Carmen!', fall: 0.62,
      building: 'bar', sign: 'EL CARMEN', width: 190, height: 200, stay: 1.4,
    },
    fx: { color: '#c9184a', color2: '#f6c445', text: '¡CERVEZA!' },
    ai: { min: 100, max: 900 },
  },
};
