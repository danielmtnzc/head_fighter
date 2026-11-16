// TANQUE — lento, duro y pesado. Especial de tipo explosión (salto + onda sísmica).
export default {
  id: 'tanque',
  name: 'TANQUE',
  tagline: 'No se mueve ni con grúa',
  color: '#2ec4b6',
  head: {
    type: 'drawn',
    size: 1.04,
    art: { skin: '#e8b48a', hair: 'bald', hairColor: '#5c3a21', brows: '#3d2413', eye: '#3d2413', wide: 1.03, extra: ['mustache', 'thickBrows'] },
  },
  body: { shirt: '#2ec4b6', shorts: '#14403c', skin: '#e8b48a', gloves: '#f4f1de', shoes: '#3d405b', detail: 'stripe', scale: 1.1, width: 1.3 },
  stats: { health: 152, speed: 0.8, jump: 0.88, power: 1.05, weight: 1.25 },
  special: {
    name: 'Terremoto',
    description: 'Salta y aplasta el suelo: explosión cercana y ondas sísmicas a ambos lados. ¡Sáltalas!',
    type: 'explosion',
    damage: 22,
    cooldown: 10,
    params: { leap: 780, blastRadius: 120, waveSpeed: 560, waveRange: 400, waveDamage: 0.6, recovery: 0.5 },
    fx: { color: '#2ec4b6', color2: '#c9a27a', text: '¡BRUUM!' },
    ai: { min: 0, max: 330 },
  },
};
