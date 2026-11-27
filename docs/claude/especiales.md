# Ataques especiales

Cada tipo es un comportamiento reutilizable en `src/combat/specials/<tipo>.js`, registrado en `index.js` (`SPECIALS`). El personaje elige el tipo con `special.type` y lo ajusta con `special.params` y `special.fx`.

Comunes: `params.say` (frase que grita en un bocadillo al lanzarlo, para cualquier tipo; la pone `Fighter.startSpecial` y dura `startup` + 1,7 s), `special.damage`, `special.cooldown` (segundos para recargar la energía de 0 a 100), `fx: { color, color2, text }` (`text` = palabra cómic al impactar), `ai: { min, max }` (distancias a las que la IA lo usa). `params.hit` permite sobrescribir el golpe (`knockback: {x, y}`, `hitstun`, `hitstop`, `shake`…); la base está en `common.js` (`specialHit`).

Al activarse, `Match.onSpecialStart` hace la pausa dramática: congela, oscurece el fondo y muestra el nombre del golpe (1,8 s). La palabra de impacto de un especial dura 1,3 s.

## Tipos

- **`projectile`** — lanza algo que viaja por la arena. `params`: `startup`, `recovery`, `speed`, `radius`, y opcionales `gravity`, `vy` (tiro en arco), `life`, `spawnX`, `spawnY`, `recoil`, `sprite` (ruta de imagen para lanzar un objeto en vez de la bola de energía), `spin`, `item` (objeto dibujado de `specials/items.js`, p. ej. `bottle`: sale en la mano al cargar y se rompe en trozos), `windPose`.
- **`dash`** — carga y embiste en línea recta. `params`: `startup`, `speed`, `duration`, `recovery`. `run: true` va corriendo por el suelo y remata con un cabezazo. `form: { head, body }` transforma al personaje durante el especial (`a.s.form`, que el dibujo lee con `f.look`; cabeza `type: 'armor'` = yelmo; `body.steelKnee` = rodilla de acero). `poses: { charge, go, hit }` cambia las poses y `reach` el alcance. `fx.trail: 'bolt'` añade rayos a la estela.
- **`explosion`** — salta, cae en picado y revienta el suelo: explosión cercana y ondas sísmicas a ambos lados que se pueden saltar. `params`: `leap`, `blastRadius`, `waveSpeed`, `waveRange`, `waveDamage` (fracción del daño), `recovery`, `advance`, `waves: false` para quitar las ondas.
- **`multihit`** — ráfaga de golpes rápidos y remate. `params`: `startup`, `hits`, `interval`, `finisher` (fracción del daño que va al remate), `recovery`, `advance`. Los golpes de la ráfaga llevan `invuln: 0` para encadenar.
- **`shotgun`** — saca una escopeta de feria, apunta y dispara un tapón rápido y recto (se puede saltar). `params`: `startup`, `recovery`, `speed`, `radius`, `muzzleX`, `muzzleY`, `recoil`.
- **`spray`** — suelta por la boca un chorro que golpea una vez. `params`: `startup`, `duration`, `recovery`, `reach`, `mouthX`, `mouthY`, `sickSkin` (color de piel mientras dura).
- **`gang`** — silba y una cuadrilla llega corriendo por detrás; cada uno pega una vez y el último remata. Se esquiva saltando: el grupo entero (`(crew-1)·gap + 120` px a `speed`) tiene que pasar en menos de ~0,45 s, que es lo que el salto más bajo (`jump` 0.88) se mantiene por encima de su caja de 60 px de alto; por eso van en piña. `params`: `startup`, `recovery`, `speed`, `gap` (separación), `behind` (distancia inicial), `finisher`, `crew` (lista de `{ art, body, size }`: cambios sobre el aspecto del luchador).

- **`pileOn`** — grita y sus amigos entran saltando desde los dos bordes de la pantalla, uno tras otro, y caen en plancha sobre el rival; al caer celebran y se vuelven corriendo. El sitio donde caen se fija al llamarlos (donde está el rival) y no sigue al rival; la sombra lo marca y se esquiva saliendo de ahí antes de que caiga el primero (`flight` s). Cada uno golpea al aterrizar; el último remata. `params`: `startup`, `recovery`, `interval`, `flight`, `height`, `spread` (separación de los aterrizajes), `width` (zona de golpe), `finisher`, `crew` (como en `gang`).

- **`skyDrop`** — del cielo cae un edificio donde está el rival; una sombra avisa (se puede esquivar). Al caer golpea, se queda un rato por detrás de los luchadores (`behind: true`) y se desvanece. `params`: `startup`, `recovery`, `fall` (segundos de caída), `width`, `height` (zona de golpe), `stay`, `building` (de `BUILDINGS` en `skyDrop.js`; hay `bar`, con la señora en la puerta), `sign` (letrero).

- **`cards`** — lanza en ráfaga cartones cuadrados de colores que giran en línea recta (se pueden saltar). Solo impacta uno por ráfaga y marea al rival; los demás le atraviesan. `params`: `startup`, `recovery`, `count`, `interval`, `speed`, `size`, `spawnX`, `spawnY`, `spread`, `dizzy` (segundos de mareo), `colors`.

- **`smoke`** — saca un cigarro y le da una calada (pose `smokeDrag`: la mano en la boca, la brasa se aviva y sale un hilillo gris); luego sopla una nube (pose `smokeBlow`, partículas `puff` de `effects.js` en `fx.color`/`fx.color2`) que avanza y golpea una vez. Se esquiva con distancia. `params`: `startup` (dura la calada), `duration` (soplido), `recovery`, `reach`, `mouthX`, `mouthY`, `cloudH` (alto de la nube), `dizzy` (segundos de mareo, opcional).

**Mareo**: cualquier golpe con `dizzy: segundos` en su `spec` deja al rival mareado (`Fighter.dizzyT`): dirección invertida, anda al 70 %, cara de dolor y estrellitas girando sobre la cabeza. Se puede usar en otros especiales con `params.hit.dizzy`.

El bocadillo de diálogo (`SpeechBubble`) está en `specials/bubble.js`.

Las entidades con `behind: true` se dibujan antes que los luchadores (`Match.draw`).

## Crear un tipo nuevo

Un tipo exporta por defecto:

```js
export default {
  start(f, sp, world, a) {},            // al empezar
  update(f, sp, world, dt, a) {},       // cada paso; devuelve true al terminar
  pose(f, a, sp) { return 'castWind'; },// nombre de pose de characters/poses.js
  prop(ctx, f, a, sp) {},               // opcional: dibuja un objeto en la mano delantera
  cancel(f, a) {},                      // opcional: si le golpean a mitad
};
```

`a` es la acción en curso: `a.t` (tiempo), `a.s` (estado libre), `a.keepVel = true` desactiva la fricción. Para golpear: `world.tryHit(f, world.opponentOf(f), {x, y, w, h}, specialHit(sp, {...}))`. Para objetos con vida propia (proyectiles, ondas): `world.spawn(entidad)`. Si hace falta una pose nueva, se añade a `STATIC` en `poses.js`. Después se registra en `index.js`.
