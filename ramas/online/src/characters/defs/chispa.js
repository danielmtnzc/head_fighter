// CHISPA — pequeña, veloz y frágil. Especial de tipo multigolpe.
export default {
  id: 'chispa',
  name: 'CHISPA',
  tagline: 'Pequeña pero matona',
  color: '#c77dff',
  groups: ['quinta'],
  head: {
    type: 'drawn',
    size: 0.98,
    art: { skin: '#ffd9b8', hair: 'pigtails', hairColor: '#ff5d8f', brows: '#b0305c', eye: '#7b2cbf', extraColor: '#ffd23f', extra: ['lashes', 'cheeks', 'freckles'] },
  },
  body: { shirt: '#c77dff', shorts: '#3c096c', skin: '#ffd9b8', gloves: '#ff5d8f', shoes: '#ff5d8f', detail: 'heart', scale: 0.94, build: 'delgado' },
  stats: { health: 155, speed: 1.3, jump: 1.15, power: 1.05, weight: 1.0 },
  special: {
    name: 'Metralleta de Tortas',
    description: 'Ráfaga de puñetazos a toda velocidad rematada con un gancho al cielo.',
    type: 'multihit',
    damage: 28,
    cooldown: 6.5,
    params: { say: '¡Toma, toma y toma!', startup: 0.12, hits: 6, interval: 0.075, finisher: 0.4, recovery: 0.4, advance: 170 },
    fx: { color: '#ff5d8f', color2: '#ffd23f', text: '¡TOMA!' },
    ai: { min: 0, max: 104 },
  },
};
