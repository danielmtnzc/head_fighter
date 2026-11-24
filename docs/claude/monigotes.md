# Cómo crear los monigotes (guía viva)

Proceso para convertir la foto de un amigo en personaje. Los campos técnicos están en docs/claude/personajes.md y los superataques en docs/claude/especiales.md.

**Esta guía se perfecciona**: cuando el usuario pida un retoque que valga para más personajes, apuntarlo en «Preferencias del usuario». Los retoques de un solo personaje van solo en su ficha.

## 1. Datos que hacen falta

| Dato | Si falta |
|---|---|
| Foto de la cara | Pedirla: sin ella no se empieza |
| Nombre o apodo | Preguntar |
| Grupo: LPS, La Quinta del Buitre o ambos | Preguntar |
| Superataque: nombre, qué saca o en qué se convierte, cómo golpea | Preguntar |
| Estatura: bajo, normal, alto | Normal |
| Frase corta | Inventarla según el superataque y avisar |
| Texto al impactar | Inventarlo (¡PREMIO!, ¡CHUPITO!, ¡CABEZAZO!) y avisar |
| Ropa | La de la foto |
| Color | Elegir uno distinto de los ya usados |

Preguntar todo lo que falte en un solo mensaje. No deducir estatura ni carácter de la foto. Si solo faltan nombre o grupo, se puede avanzar con valores provisionales y preguntar al final.

## 2. Leer la foto

Elegir de 3 a 5 rasgos que hagan reconocible a la persona y exagerarlos un poco:

- Pelo: volumen, flequillo, sienes rapadas, color y mechones.
- Forma de la cara: alargada o redonda; mandíbula.
- Expresión habitual: sonrisa con dientes, boca cerrada, párpados caídos.
- Cejas, nariz, vello facial, lunares, hoyuelos.
- Accesorios y ropa: pendiente, colgante, traje, corbata.

Si la foto es pequeña o no se distingue un rasgo, no inventarlo; pedir otra si hace falta.

## 3. Dibujar

- Siempre caricatura (`type: 'drawn'`), nunca la foto recortada. No guardar la foto en el proyecto.
- Reutilizar primero lo que hay en `art`. Si un rasgo no existe, añadirlo a `src/characters/heads.js` como opción reutilizable, sin cambiar a los demás.
- El pelo es lo que más distingue: evitar que dos amigos compartan peinado idéntico. Usados: `quiff` (Ñañi), `crop` (KalonG), `fringe` (JD), `curtain` (Pipo), `buzz` (MiniMocho). JD debe seguir siendo el más bajo.
- Coordenadas en radios de cabeza, mirando a la derecha en tres cuartos: una sola oreja, la de la izquierda.
- Estatura: `body.legs` alarga o acorta piernas y `body.scale` agranda todo. Alto: `legs 1.45, scale 1.04`. Bajo: `legs 0.8, scale 0.9`.
- `head.size` cerca de 1; si el pelo sube mucho, comprobar que no se corta en los retratos.
- Piel: cogerla algo más clara que en la foto, porque el sombreado la oscurece.

Fallos ya vistos:
- Cejas inclinadas en reposo dan cara de malo: usar `brow: 'soft'` y `eyeSize` ~0.85.
- Barba y lunares deben ser sutiles; a tamaño de juego se marcan mucho.
- Un pendiente con cruz pequeña parece el símbolo ♀: simplificar los detalles diminutos.
- La frase debe caber en una línea (unos 30 caracteres).
- Los textos de impacto de más de 11 letras se encogen solos; mejor que sean cortos.

## 4. Superataque

- Buscar primero un tipo existente y parametrizarlo: `projectile` con `item` para lanzar objetos (dibujarlos en `specials/items.js`), `dash` con `form` para transformarse, `shotgun` para disparar.
- El objeto o la transformación tiene que verse antes del golpe (unos 0,5 s) y no tapar la cara.
- Personajes o marcas de terceros: diseño propio que haga el guiño, sin copiar su aspecto ni logotipos.
- Daño de 19 a 22 y recarga de 8 s como punto de partida; debe poder esquivarse.

## 5. Comprobar

1. Las cinco expresiones en grande (`idle`, `attack`, `hurt`, `ko`, `win`) y el tamaño real en selección, VS y combate.
2. El superataque de cerca, a media distancia y de lejos, y que la consola no dé errores.
3. Equilibrio: 30 combates IA contra IA por rival (ver docs/claude/comandos.md); objetivo global del 45 al 58 % de victorias.
4. Añadir el personaje a la tabla de docs/claude/personajes.md.

Al terminar, decir al usuario qué se ha inventado (frase, textos, color) para que lo corrija.

## Preferencias del usuario

- Caricatura adaptada al juego, no recortar la cara.
- Frase de presentación relacionada con el superataque.
- Si dice qué texto «pondrá» el superataque, va tal cual al impactar (p. ej. ¡RODILLA DE ACERO!).
- Cada personaje puede estar en LPS, en La Quinta del Buitre o en ambos.
