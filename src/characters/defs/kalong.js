// KALONG — pegador de media distancia. Caricatura dibujada. Especial: lanza una botella.
export default {
  id: 'kalong',
  name: 'KalonG',
  tagline: '¿Quién se toma otro?',
  color: '#3f9b4f',
  groups: ['lps'],
  head: {
    type: 'drawn',
    size: 1,
    art: {
      skin: '#f0c19b', hair: 'crop', hairColor: '#2a1c18', hairColor2: '#4d362c', brows: '#1f1411', eye: '#4a2c18',
      wide: 0.93, nose: 'long', smile: 'teeth', eyeSize: 0.84, brow: 'soft', extra: ['thickBrows', 'stubble', 'dimples'],
    },
  },
  body: {
    shirt: '#26365c', shorts: '#26365c', skin: '#f0c19b', gloves: '#f0c19b', shoes: '#33211a',
    detail: 'beca', detailColor: '#1a2644', tieColor: '#2f4f93', scale: 1, width: 1.05,
  },
  stats: { health: 150, speed: 1, jump: 1, power: 1, weight: 1 },
  special: {
    name: 'Chupito de Jager',
    description: 'Saca la botella de Jager y la lanza: estalla al impactar.',
    type: 'projectile',
    damage: 19,
    cooldown: 8,
    params: {
      startup: 0.5, recovery: 0.35, speed: 720, vy: -180, gravity: 620, radius: 18, spawnX: 56, spawnY: -95,
      spin: 13, recoil: 0, item: 'bottle', windPose: 'itemWind',
    },
    fx: { color: '#3f9b4f', color2: '#ff9f2e', text: '¡CHUPITO!' },
    ai: { min: 120, max: 700 },
  },
};
