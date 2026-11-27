// BRASAS — pegador a distancia. Especial de tipo proyectil.
export default {
  id: 'brasas',
  name: 'BRASAS',
  tagline: 'Siempre echando chispas',
  color: '#ff5a36',
  groups: ['lps'],
  head: {
    type: 'drawn',
    size: 1,
    art: { skin: '#c98a5e', hair: 'flame', hairColor: '#ff5a1f', hairColor2: '#ffd23f', brows: '#3b1d0e', eye: '#7a3b12', extra: ['beard'], beardColor: '#4a2614' },
  },
  body: { shirt: '#e63946', shorts: '#1d1d2c', skin: '#c98a5e', gloves: '#ff9f1c', shoes: '#ffd23f', detail: 'flame', detailColor: '#ffd23f', scale: 1.02, build: 'fuerte' },
  stats: { health: 150, speed: 1.0, jump: 1.0, power: 1.05, weight: 1.0 },
  special: {
    name: 'Bola de Brasa',
    description: 'Lanza una bola de fuego que recorre toda la arena.',
    type: 'projectile',
    damage: 19,
    cooldown: 6,
    params: { say: '¡Cuidado, que quema!', startup: 0.3, recovery: 0.35, speed: 720, radius: 22 },
    fx: { color: '#ff7a1a', color2: '#ffe45c', text: '¡FUEGO!' },
    ai: { min: 220, max: 900 },
  },
};
