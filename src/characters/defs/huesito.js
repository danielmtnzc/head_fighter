// HUESITO — alto y medio-fuerte, sin camiseta, moreno y tatuado. Caricatura dibujada.
// Especial: grita «¡Perro Sanxe!» y sus colegas marroquíes le caen del cielo en plancha.
const crewSkin = (skin) => ({ skin, gloves: skin });

export default {
  id: 'huesito',
  name: 'Huesito',
  tagline: 'Un grito y viene la familia',
  color: '#c1272d',
  groups: ['quinta'],
  head: {
    type: 'drawn',
    size: 1,
    art: {
      skin: '#dba67f', hair: 'curly', hairColor: '#1f1714', hairColor2: 'rgba(255,255,255,0.18)', brows: '#1a1210', eye: '#3b2418',
      face: 'long', smile: 'flat', eyeSize: 0.85, brow: 'soft',
      extra: ['thickBrows', 'stubble', 'goatee', 'thinMustache', 'hoop'], goateeColor: 'rgba(35,22,18,0.3)',
    },
  },
  body: {
    shirt: '#dba67f', shorts: '#23252d', skin: '#dba67f', gloves: '#dba67f', shoes: '#f1f3f6',
    detail: 'tattoos', tattoos: '#2a3140', scale: 1.04, build: 'medioFuerte', legs: 1.45,
  },
  stats: { health: 168, speed: 1.03, jump: 1, power: 1.15, weight: 1.05 },
  special: {
    name: '¡Perro Sanxe!',
    description: 'Grita «¡Perro Sanxe!» y sus colegas marroquíes caen en plancha sobre el rival.',
    type: 'pileOn',
    damage: 22,
    cooldown: 7,
    params: {
      say: '¡PERRO SANXE!',
      startup: 0.5, recovery: 0.45, interval: 0.15, flight: 0.7, height: 280, spread: 28, width: 110, finisher: 0.4,
      crew: [
        { art: { hair: 'buzz', extra: ['thickBrows', 'beard'], skin: '#c99068' }, body: { shirt: '#c1272d', detail: 'star', detailColor: '#1f9e5a', tattoos: null, ...crewSkin('#c99068'), scale: 1, legs: 1.1, build: 'normal' } },
        { art: { hair: 'crop', extra: ['thickBrows', 'mustache'], skin: '#d6a07a' }, body: { shirt: '#1f9e5a', detail: 'stripe', detailColor: '#c1272d', tattoos: null, ...crewSkin('#d6a07a'), scale: 0.92, legs: 1, build: 'fuerte' } },
        { art: { hair: 'curly', extra: ['thickBrows', 'stubble'], skin: '#b98260' }, body: { shirt: '#f4f6f8', detail: 'star', detailColor: '#c1272d', tattoos: null, ...crewSkin('#b98260'), scale: 0.98, legs: 1.25, build: 'delgado' } },
        { art: { hair: 'fringe', extra: ['thickBrows', 'goatee'], skin: '#e0ae88' }, body: { shirt: '#c1272d', detail: 'stripe', detailColor: '#1f9e5a', tattoos: null, ...crewSkin('#e0ae88'), scale: 1.06, legs: 1.2, build: 'medioRelleno' } },
        { art: { hair: 'bald', extra: ['thickBrows', 'beard'], skin: '#c48a64' }, body: { shirt: '#1f9e5a', detail: 'star', detailColor: '#ffffff', tattoos: null, ...crewSkin('#c48a64'), scale: 1.12, legs: 1.1, build: 'gordo' } },
      ],
    },
    fx: { color: '#c1272d', color2: '#1f9e5a', text: '¡AMEGO SEGARRO!' },
    ai: { min: 80, max: 700 },
  },
};
