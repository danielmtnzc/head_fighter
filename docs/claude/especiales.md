# Ataques especiales

Cada tipo es un comportamiento reutilizable en `src/combat/specials/<tipo>.js`, registrado en `index.js` (`SPECIALS`). El personaje elige el tipo con `special.type` y lo ajusta con `special.params` y `special.fx`.

Comunes: `special.damage`, `special.cooldown` (segundos para recargar la energía de 0 a 100), `fx: { color, color2, text }` (`text` = palabra cómic al impactar), `ai: { min, max }` (distancias a las que la IA lo usa). `params.hit` permite sobrescribir el golpe (`knockback: {x, y}`, `hitstun`, `hitstop`, `shake`…); la base está en `common.js` (`specialHit`).

Al activarse, `Match.onSpecialStart` hace la pausa dramática: congela, oscurece el fondo y muestra el nombre del golpe.

## Tipos

- **`projectile`** — lanza algo que viaja por la arena. `params`: `startup`, `recovery`, `speed`, `radius`, y opcionales `gravity`, `vy` (tiro en arco), `life`, `spawnX`, `spawnY`, `recoil`, `sprite` (ruta de imagen para lanzar un objeto en vez de la bola de energía), `spin`.
- **`dash`** — carga y embiste en línea recta. `params`: `startup`, `speed`, `duration`, `recovery`. `fx.trail: 'bolt'` añade rayos a la estela.
- **`explosion`** — salta, cae en picado y revienta el suelo: explosión cercana y ondas sísmicas a ambos lados que se pueden saltar. `params`: `leap`, `blastRadius`, `waveSpeed`, `waveRange`, `waveDamage` (fracción del daño), `recovery`, `advance`, `waves: false` para quitar las ondas.
- **`multihit`** — ráfaga de golpes rápidos y remate. `params`: `startup`, `hits`, `interval`, `finisher` (fracción del daño que va al remate), `recovery`, `advance`. Los golpes de la ráfaga llevan `invuln: 0` para encadenar.

## Crear un tipo nuevo

Un tipo exporta por defecto:

```js
export default {
  start(f, sp, world, a) {},            // al empezar
  update(f, sp, world, dt, a) {},       // cada paso; devuelve true al terminar
  pose(f, a, sp) { return 'castWind'; },// nombre de pose de characters/poses.js
  cancel(f, a) {},                      // opcional: si le golpean a mitad
};
```

`a` es la acción en curso: `a.t` (tiempo), `a.s` (estado libre), `a.keepVel = true` desactiva la fricción. Para golpear: `world.tryHit(f, world.opponentOf(f), {x, y, w, h}, specialHit(sp, {...}))`. Para objetos con vida propia (proyectiles, ondas): `world.spawn(entidad)`. Si hace falta una pose nueva, se añade a `STATIC` en `poses.js`. Después se registra en `index.js`.
