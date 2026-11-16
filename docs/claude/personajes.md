# Personajes

Cada personaje es un objeto de configuración en `src/characters/defs/<id>.js`. El motor lo interpreta; añadir un personaje no requiere tocar el motor.

## Añadir un amigo

1. Guardar su foto en `assets/heads/` (PNG o WebP, recortada a la cara, mejor cuadrada y con fondo transparente).
2. Copiar `src/characters/defs/_plantilla.js` con otro nombre y rellenarlo.
3. Importarlo en `src/characters/roster.js` y añadirlo a `ROSTER`. Aparece solo en la selección, el HUD y la presentación VS.

## Campos

- `id`, `name`, `tagline`, `color` (color principal para interfaz y efectos).
- `head`:
  - foto: `{ type: 'image', src, shape: 'oval'|'circle', size, zoom, offsetX, offsetY, mirror }`. Se recorta en óvalo con ajuste "cover" (mantiene proporciones). `offsetX/Y` van en radios de cabeza. `mirror: false` evita voltear la foto al mirar a la izquierda. Si la imagen falla o aún carga, se usa `head.art`.
  - dibujada: `{ type: 'drawn', size, art }` con `art = { skin, hair, hairColor, hairColor2, brows, eye, wide, extra: [...], extraColor, beardColor, mustacheColor }`. `hair`: `short`, `spikes`, `flame`, `pigtails`, `bald`. `extra`: `headband`, `beard`, `mustache`, `glasses`, `lashes`, `cheeks`, `freckles`, `thickBrows`.
  - Las cabezas dibujadas cambian de expresión (`idle`, `attack`, `hurt`, `ko`, `win`); las fotos no, pero sí se inclinan, parpadean en blanco al recibir y llevan estrellitas en el K.O.
- `body`: `{ shirt, shorts, skin, gloves, shoes, detail, detailColor, scale, width }`. `detail`: `stripe`, `bolt`, `star`, `flame`, `heart`.
- `stats`: `{ health, speed, jump, power, weight }`. `health` en puntos (150 es lo normal); el resto son multiplicadores (1 = normal). `power` escala el daño de puñetazo y patada, no el del especial. `weight` reduce el retroceso recibido.
- `special`: `{ name, description, type, damage, cooldown, params, fx, ai }`. Ver docs/claude/especiales.md.

## Personajes actuales (ficticios, de prueba)

| id | Estilo | Especial (tipo) |
|---|---|---|
| rayo | rápido, equilibrado | Trueno Exprés (`dash`) |
| brasas | pegador a distancia | Bola de Brasa (`projectile`) |
| tanque | lento, pesado, resistente | Terremoto (`explosion`) |
| chispa | veloz, salta mucho | Metralleta de Tortas (`multihit`) |
