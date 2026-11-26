// LOISON — alto y delgado. Caricatura dibujada. Especial: lanza cartones mágicos que marean.
export default {
  id: 'loison',
  name: 'Loison',
  tagline: '¡Cartones Mágicos!',
  color: '#ff4f8b',
  groups: ['lps'],
  head: {
    type: 'drawn',
    size: 1,
    art: {
      skin: '#f3cdb0', hair: 'shaved', hairColor: '#3a2a22', brows: '#221611', eye: '#5a3418',
      face: 'long', wide: 0.92, smile: 'flat', eyeSize: 0.86, brow: 'soft',
      extra: ['thickBrows', 'mole'],
    },
  },
  body: {
    shirt: '#7b3fb0', shorts: '#4a2470', skin: '#f3cdb0', gloves: '#f3cdb0', shoes: '#1c1416',
    detail: 'beca', detailColor: '#1a1420', tieColor: '#151018', scale: 1.04, build: 'delgado', legs: 1.45,
  },
  stats: { health: 145, speed: 1.05, jump: 1.02, power: 0.97, weight: 0.95 },
  special: {
    name: 'Cartones Mágicos',
    description: 'Grita «¡Cartones Mágicos!» y lanza una ráfaga de cartones de colores que marean al rival.',
    type: 'cards',
    damage: 21,
    cooldown: 7.5,
    params: {
      startup: 0.5, recovery: 0.35, say: '¡Cartones Mágicos!', count: 4, interval: 0.09,
      speed: 760, size: 32, spawnX: 50, spawnY: -72, spread: 12, dizzy: 2.5,
    },
    fx: { color: '#ff4f8b', color2: '#ffd23f', text: '¡COLOCÓN!' },
    ai: { min: 120, max: 750 },
  },
};
