# Arquitectura

## Carpetas

```
index.html, css/style.css     interfaz DOM (menús, HUD, controles táctiles)
server.js                     servidor estático de desarrollo
assets/heads/                 fotos de cabezas (PNG/WebP)
src/main.js                   arranque, flujo de pantallas, bucle principal
src/config.js                 constantes globales y utilidades (clamp, lerp, rand, approach)
src/engine/match.js           un combate: el "mundo" compartido y sus fases
src/engine/camera.js          cámara de lucha lateral (encuadre, zoom, sacudidas)
src/engine/effects.js         partículas, estallidos, textos cómic, destellos, líneas de velocidad
src/engine/audio.js           efectos de sonido sintetizados (WebAudio)
src/physics/physics.js        gravedad, suelo, paredes, separación entre luchadores
src/combat/moves.js           datos de puñetazo y patada
src/combat/combat.js          cajas de colisión y resolución de impactos (tryHit)
src/combat/specials/          un archivo por tipo de especial + index.js (registro)
src/characters/defs/          una configuración por personaje (+ _plantilla.js)
src/characters/roster.js      lista de personajes disponibles
src/characters/groups.js      grupos de personajes (LPS, La Quinta del Buitre)
src/characters/fighter.js     entidad luchador: estado, entrada, ataques, animación
src/characters/poses.js       biblioteca de poses del esqueleto
src/characters/fighterRenderer.js  dibujo del cuerpo por piezas
src/characters/heads.js       cabezas (foto o dibujo paramétrico), independientes del cuerpo
src/input/                    keyboard.js (dos esquemas), touch.js (joystick + botones)
src/ai/ai.js                  IA del rival
src/stages/azotea.js          escenario
src/ui/hud.js, select.js      HUD y pantalla de selección
src/net/                      modo online (en construcción): rng.js (azar con semilla), checksum.js (hash del estado),
                              inputCodec.js (mandos en 2 bytes), lockstep.js (sesión sincronizada; usa cualquier transporte { send, onMessage }),
                              signaling.js (cliente de las salas), config.js (versión de protocolo y URL del Worker)
worker/                       Cloudflare Worker + Durable Object de las salas (no se publica en Pages)
tools/                        pruebas: determinismo (harness.js, sim.mjs, determinismo.html), lockstep (fakeNet.js, red-sim.mjs, red-local.html) y salas (worker-test.mjs)
```

## Ideas clave

- **Unidades lógicas**: la vista mide siempre 540 de alto; el ancho depende de la pantalla. El origen del mundo está en el centro del suelo: `y = 0` es el suelo y hacia arriba es negativo. El origen de un luchador son sus pies.
- **Paso fijo**: `Match.advance(dt)` acumula tiempo real y ejecuta un `tick()` por cada 1/60 s. Cada tick lee los mandos y da los pasos `step(1/60)` que toquen según `timeScale` (cámara lenta del K.O.); `hitstop` congela la simulación unos fotogramas en cada impacto.
- **Determinismo**: con la misma semilla (`seed`) y los mismos mandos por tick, dos combates son idénticos. Todo azar que afecte a la partida sale de `world.rng`; `rand()` y `Math.random` solo para efectos, cámara e IA. Nada de trigonometría en posiciones ni cajas de golpe. La simulación no lee efectos, cámara, poses ni tamaño de pantalla. El orden de los luchadores se alterna cada tick.
- **Mandos**: `tick(inputs)` recibe los de los dos y los retiene en `latch` hasta que el luchador los lee; sin argumento consulta los controladores (no durante el hitstop).
- **Fases de `Match`**: `intro` → `countdown` (3, 2, 1, ¡PELEA!) → `fight` → `ko` → `over`. Los luchadores solo leen su controlador en `fight`.
- **Controladores**: cualquier objeto con `poll(fighter, world)` que devuelva `{x, jump, punch, kick, special}` (x de -1 a 1; el resto, pulsaciones de un solo paso). Teclado, táctil e IA usan la misma interfaz; `MergedController` combina varios.
- **Mundo**: `Match` es el `world` que reciben luchadores, especiales y entidades. Ofrece `opponentOf(f)`, `spawn(entidad)`, `tryHit(att, def, box, spec)`, `fx`, `camera`, `entities`, `phase`. Una entidad es `{update(dt, world), draw(ctx), dead, owner, dangerous, x, vx}`.
- **Hooks de `Match`** hacia la interfaz: `onBanner(texto, tipo)`, `onDamage(lado)`, `onEnd(resultado)`. Con `silent: true` no suena (combate de demostración de fondo en los menús).
- **Animación por poses**: `Fighter.animName()` da el nombre de la pose según el estado; `poses.js` devuelve la pose objetivo y `animate()` interpola hacia ella. El renderer apoya en el suelo el pie más bajo y dibuja brazo trasero, piernas, torso, cabeza y brazo delantero. Los brazos y piernas se estiran "de goma" (`asF`, `lsF`…) para que los golpes sobrepasen la cabeza.
- **Flujo de pantallas** (`main.js`): `title` → `select` → `vs` → `fight` → `result`. `flowToken` invalida temporizadores y hooks de combates anteriores.
