# Partidas online — investigación

Resumen de la investigación sobre cómo añadir partidas online a Head Fighter. Todavía no hay nada implementado.

## Decisión recomendada

- **Red de la partida:** P2P con **WebRTC directo** entre los dos jugadores (canal no fiable y sin orden).
- **Modelo:** **lockstep con retraso fijo** (~3 fotogramas) y redundancia de mandos. Rollback más adelante, solo si el retraso se nota.
- **Punto de encuentro y TURN:** un **Cloudflare Worker** con Durable Objects (salas con código) que también da credenciales TURN temporales.
- **Coste:** 0 € con amigos o con una app modesta. Si se supera un límite gratuito, falla ese día; no cobran.

## Qué hay que cambiar en el juego

1. **Simulación pura y determinista** (lo más importante y lo primero):
   - `step()` no debe tocar efectos visuales (`fx`), audio, cámara ni `Math.random`. Los efectos se lanzan como eventos que consume la capa visual.
   - Usar un generador con semilla compartida (`world.rng`) para todo lo que afecte a la partida. Ejemplos actuales: la posición de las cartas (`src/combat/specials/cards.js:48`) y la palabra del golpe (`src/engine/match.js:63`).
   - Suma de comprobación del estado cada segundo. Si no coincide, el anfitrión manda el estado y el otro lo corrige. Hace falta porque `Math.sin` y `cos` pueden diferir entre Chrome y Safari de iPhone.
2. **`RemoteController`**: encaja con la interfaz actual `poll()` → `{x, jump, punch, kick, special}`. Solo se envían los mandos.
3. **Lockstep**: avanzar el fotograma N cuando estén los mandos de los dos. Cada paquete lleva los últimos ~8 mandos, así perder uno no para la partida.

Lo que ya ayuda: paso fijo (`Match.step(1/60)`), controladores intercambiables, sin backend.

## Por qué este modelo (y qué usan otros)

| Juego | Modelo |
|---|---|
| Clash Royale | Lockstep determinista con servidor propio que reenvía órdenes y evita trampas. El ~1 s de despliegue de cada carta esconde el retraso. |
| Head Soccer | No documentado. Probablemente un anfitrión que manda el estado o lockstep simple. |
| Street Fighter 6, Tekken 8, Guilty Gear | Rollback (estilo GGPO). |
| **Head Fighter (propuesta)** | Lockstep con retraso por P2P. Entre amigos no hace falta un servidor contra trampas. |

Descartado:
- **Servidor que reenvía por WebSocket**: va sobre TCP; en móvil, cuando se pierde un paquete, todo espera a que se reenvíe y hay tirones.
- **Firebase o Supabase Realtime para la partida**: demasiado lentos e irregulares a 60 fotogramas por segundo.
- **Photon o servicios de pago**: cuota mensual y SDK pesado sin necesidad.
- **Rollback desde el principio**: el mejor, pero caro con el código actual. Mejor dejar la simulación pura y añadirlo si hace falta.

## Las piezas de red

```
Al empezar (1–2 s):
  Móvil A ──WebSocket──► [Worker + Durable Object "sala-ABCD"] ◄──WebSocket── Móvil B
           (se intercambian oferta, respuesta y candidatos WebRTC; luego se cierra)

Durante el combate:
  Móvil A (anfitrión) ◄════ mandos, WebRTC directo ════► Móvil B

Solo si falla la conexión directa (~10 %, sobre todo con datos móviles):
  Móvil A ◄══► [TURN de Cloudflare] ◄══► Móvil B
```

- **Servidor de juego**: lo hace el móvil anfitrión, gratis.
- **Señalización**: hace falta un tercero porque un navegador no puede esperar conexiones entrantes ni tiene una dirección pública fija.
- **STUN**: averigua la IP pública. `stun.cloudflare.com`, gratis e ilimitado.
- **TURN**: retransmite cuando el P2P directo falla.

### WebRTC directo o PeerJS

PeerJS es una librería que usa WebRTC por dentro y trae su propio servidor de señalización. Se elige **WebRTC directo con señalización en el Worker** porque es una sola pieza propia, sin dependencias ni servidores públicos sin garantías, y da control total del canal. PeerJS solo compensaría para un prototipo de un fin de semana.

### Cloudflare o Supabase para la señalización

| | Supabase | Cloudflare Worker |
|---|---|---|
| Señalización | Realtime: canales ya hechos | Durable Objects + WebSocket (~100 líneas) |
| Credenciales TURN | Edge Function | El mismo Worker |
| TURN | No tiene | Incluido |
| Plan gratuito | Pausa el proyecto tras una semana sin uso | No se pausa |
| Cuentas, ranking, perfiles | Incluidos | Habría que montarlos |

- **Solo partidas online:** Cloudflare.
- **App con cuentas o ranking:** Supabase para cuentas y señalización, y Cloudflare para TURN.

## TURN seguro (pensando en una app)

La clave de TURN **nunca** va en el código del juego. El Worker la guarda como secreto y entrega credenciales que caducan.

1. En Cloudflare, *Realtime → TURN*: crear una clave (`KEY_ID` y `API_TOKEN`).
2. Guardar el token como secreto: `npx wrangler secret put TURN_API_TOKEN`.
3. El Worker comprueba quién pide y llama a:
   `POST https://rtc.live.cloudflare.com/v1/turn/keys/{KEY_ID}/credentials/generate-ice-servers`
   con `Authorization: Bearer <token>` y `{ "ttl": 3600 }`.
4. El juego hace `fetch('/turn')` y pasa los `iceServers` a `RTCPeerConnection`.

Cómo comprueba el Worker quién pide:
- **Web:** cabecera `Origin` (solo tu dominio) y límite de peticiones por IP.
- **App:** **Play Integrity** (Android) o **App Attest** (iOS), porque en una app no hay cabecera `Origin` útil. El código de red es el mismo; con Capacitor, idéntico al de la web.
- Además: credenciales revocables y alertas de gasto en la cuenta.

## Salas con Durable Objects

- Cada sala es un Durable Object con nombre (`sala-ABCD`); los dos jugadores que piden ese nombre acaban en el mismo.
- A crea la sala y comparte el código o el enlace `…/?sala=ABCD`; B se une.
- El objeto acepta como máximo 2 WebSockets, reenvía los mensajes de uno al otro y se cierra si nadie se une en unos minutos.
- **Usar la API de WebSocket con hibernación**: si no, la espera consume tiempo de ejecución.

## Costes (consultados en noviembre de 2026)

| Pieza | Gratis | Uso por partida |
|---|---|---|
| Durable Objects | 100.000 peticiones al día, 13.000 GB-s al día. Cada 20 mensajes WebSocket recibidos cuentan como 1 petición | ~5 peticiones, ~20.000 partidas al día |
| Worker (credenciales) | 100.000 peticiones al día | ~2 |
| Cloudflare TURN | 1.000 GB al mes (después, 0,05 $/GB; solo se cobra lo que sale del servidor) | ~1–2 MB, solo en el ~10 % de partidas |
| Metered Open Relay (alternativa) | 20 GB al mes | — |
| STUN de Cloudflare | Ilimitado | — |
| Hosting del juego | GitHub Pages, Netlify o Cloudflare Pages: gratis | — |

Red: solo viajan los mandos, unos 3–5 KB/s por jugador; un combate de 2 minutos es alrededor de 1 MB.

## Plan por fases

1. **Simulación pura y determinista**, comprobada en local con dos `Match` en paralelo recibiendo los mismos mandos. Pedir antes un plan detallado al experto: toca `match.js`, `fighter.js`, `effects.js` y los especiales.
2. **Worker**: salas con hibernación y credenciales TURN.
3. **Conexión WebRTC**, `RemoteController` y lockstep con retraso y redundancia.
4. **Interfaz**: crear o unirse a sala, selección de personajes sincronizada, desconexiones, sin pausa online.
5. **Probar con amigos por datos móviles** y decidir si hace falta rollback.

## Fuentes

- Cloudflare Realtime – Pricing: https://developers.cloudflare.com/realtime/pricing/
- Cloudflare TURN – FAQ: https://developers.cloudflare.com/realtime/turn/faq/
- Cloudflare TURN – Generate credentials: https://developers.cloudflare.com/calls/turn/generate-credentials
- Durable Objects – Pricing: https://developers.cloudflare.com/durable-objects/platform/pricing
- Durable Objects – Limits: https://developers.cloudflare.com/durable-objects/platform/limits
- Durable Objects en el plan gratuito: https://developers.cloudflare.com/changelog/2025-04-07-durable-objects-free-tier
- Workers – Pricing: https://developers.cloudflare.com/workers/platform/pricing/
- Metered Open Relay: https://www.metered.ca/tools/openrelay/
- Metered – Pricing: https://metered.ca/pricing
