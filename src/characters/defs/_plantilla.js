// PLANTILLA PARA AÑADIR UN AMIGO
// 1. Copia este archivo con otro nombre (p. ej. pepe.js) y rellena los campos.
// 2. Guarda su foto en assets/heads/ (PNG o WebP, mejor con fondo transparente o recortada a la cara).
// 3. Añade el import en ../roster.js.
// No hay que tocar nada más: el motor interpreta esta configuración.
export default {
  id: 'pepe', // identificador único, en minúsculas
  name: 'PEPE', // nombre o apodo que se muestra
  tagline: 'Frase corta de presentación',
  color: '#3a86ff', // color principal (interfaz y efectos)
  groups: ['lps', 'quinta'], // uno o ambos (ver ../groups.js)

  head: {
    type: 'image',
    src: 'assets/heads/pepe.png',
    shape: 'oval', // 'oval' | 'circle'
    size: 1, // tamaño de la cabeza (1 = normal)
    zoom: 1, // ampliación de la foto dentro del óvalo
    offsetX: 0, // desplazamiento de la foto (en radios de cabeza, -1..1)
    offsetY: 0,
    mirror: true, // false = la foto no se voltea al mirar a la izquierda
    // Si la imagen no existe o falla, se usa esta cabeza dibujada:
    art: { skin: '#f2c79b', hair: 'short', hairColor: '#4a3728' },
    // hair: 'short' | 'spikes' | 'flame' | 'pigtails' | 'bald' | 'quiff'
    // extra: ['headband','beard','mustache','glasses','lashes','cheeks','freckles','thickBrows','earring','dimples']
  },

  body: {
    shirt: '#3a86ff', shorts: '#1d3557', skin: '#f2c79b', gloves: '#e63946', shoes: '#ffffff',
    detail: 'star', // 'stripe' | 'bolt' | 'star' | 'flame' | 'heart' | 'beca' | null
    scale: 1, // tamaño global del cuerpo
    build: 'normal', // complexión: delgado | normal | medioFuerte | fuerte | medioRelleno | pocoGordo | muyGordo
    legs: 1, // longitud de piernas (más = más alto)
  },

  // 1 = valor normal. health es la vida en puntos (150 = normal).
  stats: { health: 150, speed: 1, jump: 1, power: 1, weight: 1 },

  special: {
    name: 'Nombre del golpe',
    description: 'Qué hace.',
    type: 'projectile', // 'projectile' | 'dash' | 'explosion' | 'multihit' | 'shotgun' (ver src/combat/specials/)
    damage: 18,
    cooldown: 7, // segundos que tarda en recargarse
    // Parámetros propios de cada tipo (ver docs/claude/personajes.md)
    params: { startup: 0.3, recovery: 0.35, speed: 700, radius: 22 },
    // Efectos: colores, texto cómic al impactar y, en proyectiles, sprite opcional
    fx: { color: '#3a86ff', color2: '#ffffff', text: '¡PAM!' },
    // Distancias a las que la IA intentará usarlo
    ai: { min: 200, max: 900 },
  },
};
