// JD — bajito y rápido. Caricatura dibujada. Especial: se transforma y embiste de cabeza.
export default {
  id: 'jd',
  name: 'JD',
  tagline: 'Pequeño pero de hierro',
  color: '#8b5cf6',
  groups: ['lps', 'quinta'],
  head: {
    type: 'drawn',
    size: 1.04,
    art: {
      skin: '#f3c9a8', hair: 'fringe', hairColor: '#33231c', hairColor2: '#5b4133', brows: '#2a1b15', eye: '#4d3a24',
      face: 'long', nose: 'long', eyeSize: 0.84, brow: 'soft', extra: ['thickBrows', 'lids', 'goatee', 'mole'],
    },
  },
  body: {
    shirt: '#1f2f52', shorts: '#1f2f52', skin: '#f3c9a8', gloves: '#f3c9a8', shoes: '#2d2320',
    detail: 'cross', detailColor: '#dfe6ee', scale: 0.9, build: 'medioFuerte', legs: 0.8,
  },
  stats: { health: 150, speed: 1.1, jump: 1.06, power: 1, weight: 0.94 },
  special: {
    name: 'Cabezazo de Mini Peka',
    description: 'Se transforma en un mini caballero de hierro, sale corriendo y arrea un cabezazo.',
    type: 'dash',
    damage: 22,
    cooldown: 8,
    params: {
      startup: 0.5, speed: 820, duration: 0.65, recovery: 0.4, run: true,
      form: {
        head: { type: 'armor', size: 1 },
        body: { shirt: '#5a6478', shorts: '#3b4252', skin: '#7d8799', gloves: '#b87333', shoes: '#2b303c', detail: 'bolt', detailColor: '#8dff6a', build: 'normal', width: 1.2 },
      },
    },
    fx: { color: '#8b5cf6', color2: '#8dff6a', text: '¡CABEZAZO!' },
    ai: { min: 110, max: 480 },
  },
};
