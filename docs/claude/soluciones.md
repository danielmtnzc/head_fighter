# Registro de soluciones

Bugs difíciles ya resueltos: síntoma, causa y solución en dos o tres líneas.

- **Online: miles de «esperas» con buena wifi.** Causa: `LockstepSession` guardaba el tiempo no gastado; tras un parón de un móvil, el otro iba siempre al límite (esperaba en uno de cada tres fotogramas). Solución: en cada espera se descarta una décima parte de ese tiempo (`DEBT_FORGIVE`).
