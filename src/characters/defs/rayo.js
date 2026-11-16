// RAYO — rápido y equilibrado. Especial de tipo embestida.
export default {
  id: 'rayo',
  name: 'RAYO',
  tagline: 'El más rápido del barrio',
  color: '#ffd23f',
  head: {
    type: 'drawn',
    size: 1,
    art: { skin: '#f2c79b', hair: 'spikes', hairColor: '#ffe45c', brows: '#a8780c', eye: '#2f80ed', extra: ['headband'], extraColor: '#e63946' },
  },
  body: { shirt: '#ffd23f', shorts: '#2b2d42', skin: '#f2c79b', gloves: '#e63946', shoes: '#ffffff', detail: 'bolt', detailColor: '#2b2d42', scale: 1, width: 1 },
  stats: { health: 150, speed: 1.2, jump: 1.05, power: 0.95, weight: 0.95 },
  special: {
    name: 'Trueno Exprés',
    description: 'Carga un instante y cruza la pantalla como un relámpago.',
    type: 'dash',
    damage: 20,
    cooldown: 7,
    params: { startup: 0.28, speed: 1250, duration: 0.3, recovery: 0.3 },
    fx: { color: '#ffe45c', color2: '#7df9ff', text: '¡ZAS!', trail: 'bolt' },
    ai: { min: 150, max: 430 },
  },
};
