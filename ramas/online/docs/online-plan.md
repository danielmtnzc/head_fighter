# Plan del modo online

Estado: **aprobado**; F0, F1 (probada en PC y móvil), F2, F3 (salas) y F4 (primera partida, probada con dos jugadores en el PC y entre PC y móvil) hechas en la rama `online`; F5 (interfaz completa y desconexiones) hecha y probada con dos jugadores en el PC, y entre dos móviles por wifi. Siguiente: F6. La investigación previa está en `online.md`; donde difieran, manda este plan.

## Decisiones confirmadas

- Primera versión: sala con código o enlace, 1 contra 1, elegir personaje y revancha. Sin cuentas ni ranking.
- Cloudflare: Worker + Durable Objects (WebSocket con hibernación) para señalización y TURN. La cuenta la crea el usuario.
- WebRTC directo, lockstep con retraso y redundancia de mandos. Sin rollback.
- Antes de programar: commit de los cambios pendientes y rama `online`.

## Qué hay que arreglar en el juego

La simulación ya es casi determinista: no lee efectos, audio, cámara ni tamaño de pantalla.

| Problema | Dónde | Arreglo |
|---|---|---|
| Azar y seno en la caja de golpe del cartón | `cards.js:48,52,61` | `world.rng`; la oscilación solo en el dibujo |
| `Math.random` al crear luchadores (también dentro de especiales) | `fighter.js:39` | `animT = side*1.5` |
| La cámara lenta escala el tiempo real | `match.js:95,112-119,176` | `tick()`: un fotograma de red, `timeScale` dentro de la simulación |
| Pulsaciones durante el hitstop se perderían | `fighter.js:65`, `match.js:143-149` | Leer una vez por tick y retener (latch) en `Match` |
| Joystick analógico | `touch.js:101` | Cuantizar, también para el jugador local |
| La interfaz borra pulsaciones al empezar | `main.js:105-106` | Lo sustituye el latch |
| El J1 gana todos los golpes simultáneos | `match.js:151` | Alternar el orden según la paridad del fotograma |

Regla nueva: `world.rng` para lo que afecte a la partida, `rand()` solo para efectos y cámara, y nada de trigonometría en posiciones o cajas de golpe.

## Archivos nuevos

- `src/net/`: `rng.js` (mulberry32), `checksum.js`, `inputCodec.js` (2 bytes por mando), `lockstep.js`, `peer.js`, `signaling.js`, `online.js`, `config.js` (versión de protocolo y URL del Worker).
- `src/ui/lobby.js` y pantalla `screen-online`.
- `worker/`: `package.json` (solo `wrangler`), `wrangler.toml` (`new_sqlite_classes`, obligatorio en el plan gratuito; `ALLOWED_ORIGINS`), `src/index.js` (router y clase `Room`). Excluido de Pages con `export-ignore`.
- `tools/`: `sim.mjs`, `determinismo.html`, `red-local.html`, `worker-test.mjs`.

## Señalización (WebSocket JSON, `/sala/ABCD`)

- Cliente: `hola{v, rol, token?}`, `senal{data}`, `adios`.
- Sala: `sala{code, asiento, token}`, `emparejados{ice, ronda}`, `senal{data}`, `rival-fuera{definitivo}`, `error{llena | no-existe | ocupada | version | origen | caducada | abuso}`.
- Código de 4 letras sin I ni O, generado por el cliente. Máximo 2 asientos; asiento recuperable 60 s con su token (un token caducado da `caducada`). Pasado ese plazo el asiento queda libre para cualquiera con el código.
- La sala se cierra tras 10 min sin dos jugadores o 5 min vacía. Comprueba `Origin`.
- Contra el abuso: 60 conexiones y 6 credenciales TURN nuevas por minuto e IP, y 100 mensajes cada 10 s por conexión.
- Sin endpoint público `/turn`: la sala entrega las credenciales (1 h, reutilizadas 30 min) al emparejar. Sin secreto TURN, solo STUN.
- El WebSocket se mantiene abierto (hibernado). El cliente manda `ping` cada 8 s y se reconecta si no hay respuesta en 10 s; la sala da por caído a quien calla 90 s.
- F4: negociar de cero con cada `emparejados` de ronda nueva (ignorar repetidas; las señales enviadas sin rival se pierden). Puede ser otra persona: comprobarlo con el `hola` del canal `ctl`. Con el canal P2P abierto, `rivalFuera` o `reconectando` no cortan la partida.
- Lockstep: quien tiene que esperar renuncia a una décima parte de ese tiempo; sin eso, tras un parón de uno el otro iba al límite el resto del combate (a tirones y con miles de «esperas»).
- F6, a mano: cortar la red del móvil sin cerrar la app y publicar el Worker a mitad de una partida.

## Partida

- Dos canales: `ctl` (fiable y ordenado) e `inp` (sin orden ni reenvíos).
- Los botones viajan como pulsaciones de ese fotograma (no «mantenido»); solo `x` es continua.
- `inp`: `[tipo][partida][ack][primerFrame][n][n × (x, botones)][frame][hash]` con los mandos sin confirmar (máx. 64) y la última suma de comprobación (cada 30 fotogramas y al acabar).
- F4: `empezar` lleva además `matchId` (contador por revancha); cada combate crea su `LockstepSession` y cierra la anterior. Seguir llamando a `update()` hasta `finished` y un segundo más (con tope de 2 s) antes de mandar `fin`. Ping cada segundo como paquete propio por `inp` (otro byte de tipo; `receive` devuelve `false` y `peer.js` lo atiende). Canal con `binaryType = 'arraybuffer'`; no enviar si no está abierto o `bufferedAmount` se acumula. «Conexión perdida» se decide con `sinceRecv`. Si hay muchas esperas, valorar un fotograma más de retraso.
- `ctl`: `hola{v, rosterHash, uid}` (rechaza versiones distintas; `uid` distinto = rival nuevo), `yo{pick, sel, listo, revancha, preparado, ausente, fin}` (estado completo, se repite en cada cambio y al reconectar; los números dicen a qué combate se refieren), `empezar{to, seed, delay, matchId, picks}`, `adios` (salida voluntaria: el rival gana), `corte{fin}` (cierre por fallo: no cuenta como abandono; también va por la sala). Del invitado solo se acepta un `fin` en el que se da por perdido; si difieren, manda el anfitrión. Un combate con el resultado ya decidido (K.O. incluido) no se pierde por un corte. Detalle en `src/net/online.js`.
- Reconexión: sin recibir nada en 3 s, se intenta rehacer la conexión entera cada 5 s (sin reinicio de ICE ni cortar un intento en marcha) y se manda `sigo{fin}` por la sala. A los 30 s: quien no llega a la sala cierra con «Se ha perdido la conexión» y gana el que sigue conectado; si llegan los dos pero no entre sí, no gana nadie.
- Hasta que los dos han coincidido (conexiones con señales de hace menos de 20 s) la sala guarda el asiento 5 min: el creador sale de la app para mandar el código.
- Por probar en iPhone: que `pagehide` no salte al cambiar de app (abandonaría la sala).
- Anfitrión = J1 a la izquierda; el invitado controla el lado 1. El HUD marca «TÚ».
- El anfitrión genera la semilla con `crypto.getRandomValues`. Retraso `D = clamp(ceil(RTT/2/16.7)+1, 3, 7)`, medido en la selección; los primeros D fotogramas llevan mandos neutros.
- Ambos muestran el VS, envían `preparado` y empiezan la cuenta atrás en el tick 0. Máximo 4 ticks por fotograma de pantalla. Aviso a los 0,5 s de espera; conexión perdida a los 10 s sin paquetes.
- Desincronización: aviso en `?debug=1`, volcado para depurar y el resultado lo decide el anfitrión. Sin corrección de estado en esta versión.
- Sin pausa. App en segundo plano: el rival espera 30 s y, si no vuelve, gana.

## Fases

| Fase | Contenido | Cómo se prueba | A mano (usuario) |
|---|---|---|---|
| F0 | Commit pendiente y rama `online` | — | — |
| F1 | Simulación determinista: `match.js`, `fighter.js`, `cards.js`, `rng.js`, `checksum.js` | `node tools/sim.mjs` (dos `Match`, todos los pares y especiales); `determinismo.html` con mismos resultados en PC e iPhone; jugar en local | Abrir `determinismo.html` en el móvil |
| F2 | Lockstep sin red: `inputCodec.js`, `lockstep.js` | `red-local.html` con 80 ± 30 ms y 20 % de pérdida | — |
| F3 | Worker y `signaling.js` | `npx wrangler dev` (sin cuenta) y `worker-test.mjs` | — |
| F4 | WebRTC mínimo: `peer.js`, `online.js` | Dos pestañas; PC y móvil por wifi | — |
| F5 | Interfaz: sala, enlace `?sala=`, selección, revancha, desconexiones | Flujo completo, cerrar pestaña, segundo plano, código inexistente | — |
| F6 | Despliegue | Probar en `/ramas/online/` por datos móviles | Cuenta, `npx wrangler login` y `deploy`, `ALLOWED_ORIGINS`, claves TURN (opcional) |
| F7 | Documentación (`docs/claude/online.md` y secciones afectadas) | — | — |

## Riesgos

- Sin TURN, bastantes partidas 4G contra 4G fallarán (más del 10 % estimado en `online.md`).
- iOS puede cortar WebRTC en segundo plano; en bajo consumo limita el juego a 30 fotogramas.
- Divergencias ocultas en algún especial: las buscan `sim.mjs` y la prueba PC contra iPhone.

## Decidido al aprobar

1. TURN en Cloudflare; si pide tarjeta y no se quiere dar, empezar solo con STUN (alternativa: Metered Open Relay, 20 GB/mes).
2. Anfitrión a la izquierda e invitado a la derecha, cada uno marcado con «TÚ».
3. Quien pase 30 s fuera de la app o sin conexión pierde.
