# Ataques especiales

Cada tipo es un comportamiento reutilizable en `src/combat/specials/<tipo>.js`, registrado en `index.js` (`SPECIALS`). El personaje elige el tipo con `special.type` y lo ajusta con `special.params` y `special.fx`.

Comunes: `special.damage`, `special.cooldown` (segundos para recargar la energía de 0 a 100), `fx: { color, color2, text }` (`text` = palabra cómic al impactar), `ai: { min, max }` (distancias a las que la IA lo usa). `params.hit` permite sobrescribir el golpe (`knockback: {x, y}`, `hitstun`, `hitstop`, `shake`…); la base está en `common.js` (`specialHit`).

Al activarse, `Match.onSpecialStart` hace la pausa dramática: congela, oscurece el fondo y muestra el nombre del golpe.

## Tipos

- **`projectile`** — lanza algo que viaja por la arena. `params`: `startup`, `recovery`, `speed`, `radius`, y opcionales `gravity`, `vy` (tiro en arco), `life`, `spawnX`, `spawnY`, `recoil`, `sprite` (ruta de imagen para lanzar un objeto en vez de la bola de energía), `spin`, `item` (objeto dibujado de `specials/items.js`, p. ej. `bottle`: sale en la mano al cargar y se rompe en trozos), `windPose`.
- **`dash`** — carga y embiste en línea recta. `params`: `startup`, `speed`, `duration`, `recovery`. `run: true` va corriendo por el suelo y remata con un cabezazo. `form: { head, body }` transforma al personaje durante el especial (`a.s.form`, que el dibujo lee con `f.look`; cabeza `type: 'armor'` = yelmo; `body.steelKnee` = rodilla de acero). `poses: { charge, go, hit }` cambia las poses y `reach` el alcance. `fx.trail: 'bolt'` añade rayos a la estela.
- **`explosion`** — salta, cae en picado y revienta el suelo: explosión cercana y ondas sísmicas a ambos lados que se pueden saltar. `params`: `leap`, `blastRadius`, `waveSpeed`, `waveRange`, `waveDamage` (fracción del daño), `recovery`, `advance`, `waves: false` para quitar las ondas.
- **`multihit`** — ráfaga de golpes rápidos y remate. `params`: `startup`, `hits`, `interval`, `finisher` (fracción del daño que va al remate), `recovery`, `advance`. Los golpes de la ráfaga llevan `invuln: 0` para encadenar.
- **`shotgun`** — saca una escopeta de feria, apunta y dispara un tapón rápido y recto (se puede saltar). `params`: `startup`, `recovery`, `speed`, `radius`, `muzzleX`, `muzzleY`, `recoil`.
- **`spray`** — suelta por la boca un chorro que golpea una vez. `params`: `startup`, `duration`, `recovery`, `reach`, `mouthX`, `mouthY`, `sickSkin` (color de piel mientras dura).

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
