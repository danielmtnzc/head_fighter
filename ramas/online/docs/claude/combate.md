# Combate

## Ataques básicos (`src/combat/moves.js`)

Cada movimiento tiene `startup` → `active` → `recovery` (segundos), `lunge` (impulso hacia delante), `hitbox` relativa a los pies mirando a +x, y `hit`.

- Puñetazo: rápido (0,07 s de preparación), alcance corto, 6 de daño, retroceso horizontal.
- Patada: más lenta (0,15 s), más alcance, 10 de daño, levanta y desplaza más.
- Ambos se pueden usar en el aire; se cortan al aterrizar.

## Impactos (`src/combat/combat.js`)

`tryHit(world, att, def, box, spec)` comprueba el solape entre la caja de ataque y la caja del defensor (`BODY` en `config.js`). Si hay contacto: `def.takeHit` (daño, retroceso dividido por `weight`, estado `hurt`) y `world.onHit` (estallido, congelación, sacudida, texto cómic, sonido, energía).

- Un ataque básico solo golpea una vez (`action.hit`).
- Tras recibir un golpe hay invulnerabilidad: `spec.invuln`, o por defecto `hitstun + 0,14 s`.
- `spec`: `{ damage, knockback: {x, y}, hitstun, hitstop, shake, power (1-3), invuln?, dir?, text?, color?, special? }`.

## Energía del especial

De 0 a 100. Sube sola (`100 / cooldown` por segundo), al golpear con ataques básicos (daño × 0,9) y al recibir (daño × 0,5). Empieza en 40. El especial la gasta entera.

## Fin del combate

K.O. cuando la vida llega a 0: cámara lenta, enfoque al perdedor, rebote, y pose de victoria del ganador. Si el tiempo (`ROUND_TIME`, 99 s) se agota gana quien conserve mayor porcentaje de vida; si empatan, empate.

## IA (`src/ai/ai.js`)

`AIController(level)` con 0 fácil, 1 normal, 2 difícil. Decide cada pocas décimas según la distancia (lejos, media, cuerpo a cuerpo) con probabilidades: acercarse, esperar, retroceder, saltar con patada aérea, puñetazo, patada. Usa el especial si está cargado y el rival está dentro de `special.ai`. Esquiva con salto las entidades `dangerous` que se le acercan. El nivel acorta los tiempos de decisión y sube la probabilidad de esquivar y de usar el especial.

## Equilibrio

La duración de los combates se regula con `HEALTH_SCALE` (`config.js`), que multiplica la vida de todos; así no hay que tocar daños ni personajes. Con `HEALTH_SCALE = 2` las simulaciones IA contra IA duran unos 72 s de media (con 1 duraban 35 s y entre humanos ~30 s). El daño se reparte aproximadamente 63 % golpes básicos y 37 % especiales. En esas simulaciones Tanque y Rayo ganan más que Brasas y Chispa; es orientativo, porque depende de cómo juega la IA cada especial.
