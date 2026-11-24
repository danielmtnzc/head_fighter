# Interfaz, controles y escenario

## Pantallas (DOM en `index.html`, estilos en `css/style.css`)

- `#screen-title`: logotipo y JUGAR, con un combate de demostración IA contra IA de fondo.
- `#screen-select`: modo (1 jugador vs CPU / 2 jugadores), dificultad de la CPU y luchador de cada lado. La construye `src/ui/select.js` a partir de `ROSTER`. En cada lado, las pestañas de grupo (LPS / La Quinta del Buitre) filtran los luchadores visibles sin cambiar el elegido; las insignias muestran los grupos del personaje (también en VS).
- `#screen-vs`: presentación de los dos personajes (2,1 s) antes de la cuenta atrás.
- `#screen-result`: ganador, revancha, cambiar luchadores, menú.
- `#screen-pause`: tecla Esc o botón del HUD; también al ocultar la pestaña.
- `#rotate`: aviso de girar el móvil (solo táctil en vertical).

Todo se mide en `rem`; `1rem = min(2.6vh, 1.5vw)`, así escala con cualquier pantalla horizontal.

## HUD (`src/ui/hud.js`)

Retrato con expresión en vivo, nombre, barra de vida (la barra blanca "fantasma" baja con retraso y la barra tiembla al recibir), barra de energía que brilla y muestra el nombre del especial cuando está lista, temporizador y rótulos (`#banner`). Durante el resultado se oculta.

## Controles

Teclado (`src/input/keyboard.js`):
- Jugador 1: A/D mover, W o Espacio salto, J puño, K patada, L especial.
- Jugador 2: flechas izquierda/derecha, flecha arriba, Numpad 1/2/3 (alternativa para portátiles: `,` `.` `-`).

Táctil (`src/input/touch.js`, Pointer Events, un `pointerId` por dedo): joystick en la mitad izquierda que se centra donde se apoya el pulgar, y cuatro botones a la derecha. El botón especial se rellena con la carga y brilla cuando está listo. Los controles táctiles se muestran si el dispositivo es `pointer: coarse` o al primer toque; en táctil el suelo sube (75 % de la altura) para que no tapen a los luchadores. En modo 2 jugadores el segundo usa teclado.

## Escenario (`src/stages/azotea.js`)

Un escenario exporta `drawBackground(ctx, view, cam, t)` (espacio de pantalla, capas con paralaje) y `drawFloor(ctx)` (espacio de mundo). Es procedural. Para añadir otro, crear un archivo con la misma interfaz y pasarlo a `Match` en `main.js`. Los límites de la arena están en `STAGE` (`config.js`).
