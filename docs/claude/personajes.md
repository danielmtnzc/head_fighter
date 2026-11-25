# Personajes

Cada personaje es un objeto de configuración en `src/characters/defs/<id>.js`. El motor lo interpreta; añadir un personaje no requiere tocar el motor.

## Añadir un amigo

El proceso habitual (caricatura a partir de la foto) está en docs/claude/monigotes.md. Alternativa con foto recortada:

1. Guardar su foto en `assets/heads/` (PNG o WebP, recortada a la cara, mejor cuadrada y con fondo transparente).
2. Copiar `src/characters/defs/_plantilla.js` con otro nombre y rellenarlo.
3. Importarlo en `src/characters/roster.js` y añadirlo a `ROSTER`. Aparece solo en la selección, el HUD y la presentación VS.

## Campos

- `id`, `name`, `tagline`, `color` (color principal para interfaz y efectos).
- `groups`: grupos a los que pertenece, uno o ambos: `['lps']`, `['quinta']`, `['lps', 'quinta']`. Sin el campo, aparece en todos. Se definen en `src/characters/groups.js` (nombre y color).
- `head`:
  - foto: `{ type: 'image', src, shape: 'oval'|'circle', size, zoom, offsetX, offsetY, mirror }`. Se recorta en óvalo con ajuste "cover" (mantiene proporciones). `offsetX/Y` van en radios de cabeza. `mirror: false` evita voltear la foto al mirar a la izquierda. Si la imagen falla o aún carga, se usa `head.art`.
  - dibujada: `{ type: 'drawn', size, art }` con `art = { skin, hair, hairColor, hairColor2, brows, eye, wide, extra: [...], extraColor, beardColor, mustacheColor }`. `hair`: `short`, `spikes`, `flame`, `pigtails`, `bald`, `quiff` (tupé con sienes degradadas), `crop` (corto con sienes degradadas), `fringe` (texturizado con flequillo), `bangs` (tupido y recto sobre la frente, lados rapados), `curtain` (media melena corta con raya), `buzz` (rapado), `pomp` (tupé redondo peinado hacia atrás, sienes degradadas), `shaved` (rapado al cero con entradas). `extra`: `headband`, `beard`, `mustache`, `glasses`, `lashes`, `cheeks`, `freckles`, `thickBrows`, `earring`, `dimples`, `stubble` (barba de pocos días), `goatee` (`goateeColor`), `thinMustache`, `mole`, `lids` (párpados caídos), `hoop` (aro pequeño), `earbud` (auricular). Para caricaturas: `face: 'long'` (cara alargada), `nose: 'long'`, `smile: 'teeth'|'flat'`, `brow: 'soft'`, `eyeSize`.
  - Las cabezas dibujadas cambian de expresión (`idle`, `attack`, `hurt`, `ko`, `win`); las fotos no, pero sí se inclinan, parpadean en blanco al recibir y llevan estrellitas en el K.O.
- `body`: `{ shirt, shorts, skin, gloves, shoes, detail, detailColor, scale, build, width, legs }`. `build` es la complexión (`src/characters/builds.js`; tipos en docs/claude/monigotes.md) y `width` un ajuste fino opcional de la anchura del torso. `detail`: `stripe`, `bolt`, `star`, `flame`, `heart`, `beca` (camisa, corbata y beca de graduación o solapas de traje; `tieColor` = corbata), `cross` (americana abierta con colgante de cruz), `straps` (jersey y tirantes de mochila), `blazer` (americana abierta y camisa blanca sin corbata; `detailColor` = solapas). `legs` alarga las piernas sin agrandar la cabeza (la caja de colisión no cambia).
- `stats`: `{ health, speed, jump, power, weight }`. `health` en puntos (150 es lo normal); el resto son multiplicadores (1 = normal). `power` escala el daño de puñetazo y patada, no el del especial. `weight` reduce el retroceso recibido.
- `special`: `{ name, description, type, damage, cooldown, params, fx, ai }`. Ver docs/claude/especiales.md.

## Personajes actuales

Los amigos se hacen como caricatura dibujada a partir de su foto (`type: 'drawn'`), no con la foto recortada. `nani` (Ñañi), `kalong` (KalonG), `jd` (JD), `pipo` (Pipo), `minimocho` (MiniMocho), `mogailes` (Mogailes), `escu` (Escu) y `loison` (Loison) son amigos reales; los demás son ficticios, de prueba, y su grupo es provisional.

| id | Estilo | Especial (tipo) | Grupos |
|---|---|---|---|
| rayo | rápido, equilibrado | Trueno Exprés (`dash`) | lps |
| brasas | pegador a distancia | Bola de Brasa (`projectile`) | lps |
| tanque | lento, pesado, resistente | Terremoto (`explosion`) | quinta |
| chispa | veloz, salta mucho | Metralleta de Tortas (`multihit`) | quinta |
| nani | alto, equilibrado, a distancia | Disparo de escopeta de feria (`shotgun`) | lps y quinta |
| kalong | pegador, media distancia | Chupito de Jager (`projectile` con `item`) | lps |
| jd | bajito, rápido y ligero | Cabezazo de Mini Peka (`dash` con `run` y `form`) | lps y quinta |
| pipo | alto, equilibrado, cuerpo a cuerpo | Rodilla de acero (`dash` con `poses` y `form.body.steelKnee`) | lps |
| minimocho | ligero, media distancia | Pota de ucraniana (`spray`) | lps |
| mogailes | equilibrado, a distancia | Paliza de las 600 (`gang`) | lps |
| escu | gordo, resistente, a cualquier distancia | Ronda de pollos (`skyDrop`) | lps |
| loison | alto, delgado, a distancia; marea al rival | Cartones Mágicos (`cards`) | lps |
