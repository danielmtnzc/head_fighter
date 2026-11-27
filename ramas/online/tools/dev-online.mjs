// Arranca a la vez el juego (server.js) y el servidor de salas (puerto 8787) para probar el
// online en el PC o en la red local: node tools/dev-online.mjs
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
createRequire(import.meta.url)('../server.js');

const args = ['worker/node_modules/wrangler/bin/wrangler.js', 'dev', '--config', 'worker/wrangler.toml', '--ip', '0.0.0.0', '--port', '8787'];
// sin PORT: es del servidor del juego
const { PORT, ...env } = process.env;
const salas = spawn(process.execPath, args, { cwd: root, env, stdio: 'inherit' });
salas.on('exit', (code) => process.exit(code ?? 0));
process.on('exit', () => salas.kill());
