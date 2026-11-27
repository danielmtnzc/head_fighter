# Plan del modo online

Estado: **pendiente de aprobación**, nada implementado. La investigación previa está en `online.md`; donde difieran, manda este plan.

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

- Cliente: `hola{v, rol, token?}`, `senal{data}`.
- Sala: `sala{code, asiento, token}`, `emparejados{ice}`, `senal{data}`, `rival-fuera`, `error{llena | no-existe | ocupada | version | origen}`.
- Código de 4 letras sin I/O/0/1, generado por el cliente. Máximo 2 asientos; asiento recuperable 60 s con su token.
- La sala se cierra tras 10 min sin dos jugadores o 5 min vacía. Comprueba `Origin`.
- Sin endpoint público `/turn`: la sala entrega las credenciales (1 h) al emparejar. Sin secreto TURN, solo STUN.
- El WebSocket se mantiene abierto (hibernado) para presencia y reconexión.

## Partida

- Dos canales: `ctl` (fiable y ordenado) e `inp` (sin orden ni reenvíos).
- `inp`: `[tipo][ack][primerFrame][n][n × (x, botones)]` con los mandos sin confirmar (máx. 64). Cada 30 fotogramas, suma de comprobación; cada segundo, ping.
- `ctl`: `hola{v, rosterHash}` (rechaza versiones distintas), `pick`, `listo`, `empezar{seed, delay, picks}`, `preparado`, `fin`, `revancha`, `cambiar`, `ausente`, `vuelvo`, `adios`, `desync`.
- Anfitrión = J1 a la izquierda; el invitado controla el lado 1. El HUD marca «TÚ».
- El anfitrión genera la semilla con `crypto.getRandomValues`. Retraso `D = clamp(ceil(RTT/2/16.7)+1, 2, 7)`, medido en la selección; los primeros D fotogramas llevan mandos neutros.
- Ambos muestran el VS, envían `preparado` y empiezan la cuenta atrás en el tick 0. Máximo 4 ticks por fotograma de pantalla. Aviso a los 0,5 s de espera; conexión perdida a los 10 s sin paquetes.
- Desincronización: aviso en `?debug=1`, volcado para depurar y el resultado lo decide el anfitrión. Sin corrección de estado en esta versión.
- Sin pausa. App en segundo plano: el rival espera 30 s y, si no vuelve, gana. Reconexión con reinicio de ICE; si falla, botón «volver a conectar».

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

## Por decidir

1. TURN si Cloudflare pide tarjeta: ponerla, usar Metered Open Relay (20 GB/mes) o quedarse con STUN.
2. Lados: anfitrión a la izquierda con «TÚ» (recomendado) o cada uno se ve a la izquierda (más trabajo).
3. Abandono: 30 s fuera equivalen a victoria del que se queda.
