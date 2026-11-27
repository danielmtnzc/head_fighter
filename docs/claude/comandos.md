# Comandos

- Arrancar: `node server.js` → http://localhost:5173 (servidor estático sin dependencias; puerto con la variable `PORT`).
- En Claude: configuración `la-quinta-del-buitre` de `.claude/launch.json`.
- No hay build, ni paquetes, ni tests automáticos. Los módulos ES necesitan servidor: abrir `index.html` con `file://` no funciona.
- Probar en el móvil: mismo wifi y abrir `http://<IP-del-PC>:5173` en horizontal (el servidor escucha en 0.0.0.0).
- Publicar: GitHub Pages sirve la rama `gh-pages`, que monta `.github/workflows/pages.yml` en cada push. `main` queda en la raíz y cada otra rama en `/ramas/<rama>/` (las `/` del nombre pasan a `-`); `/ramas/` lista todas. Para probar algo sin tocar la versión estable: trabajar en una rama, subirla y abrir su URL; al fusionar en `main` y borrar la rama, desaparece de `/ramas/`. Las rutas del juego deben seguir siendo relativas para que funcione en subcarpetas.

## Depuración

En la consola del navegador, `HF.match` es el combate en curso y `HF.ROSTER` la plantilla. Ejemplos: `HF.match.fighters[0].energy = 100`, `HF.match.fighters[1].hp = 5`.

Simular combates IA contra IA sin dibujar (para equilibrar): crear `new Match({cfgs, controllers:[new AIController(1), new AIController(1)], stage:{drawBackground(){},drawFloor(){}}, silent:true})`, asignar `m.view = {w:960,h:540,groundY:430}`, llamar `m.startCountdown()` y repetir `m.step(1/60)` hasta `m.phase === 'over'`; el resultado queda en `m.result`.
