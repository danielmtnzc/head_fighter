// Ajustes del modo online.
export const PROTO = 1; // versión del protocolo; la sala y el rival deben tener la misma

// URL del Worker publicado (wss://head-fighter-salas.<subdominio>.workers.dev). Vacía hasta publicarlo.
const PRODUCTION_URL = '';
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\]|10(\.\d+){3}|192\.168(\.\d+){2}|172\.(1[6-9]|2\d|3[01])(\.\d+){2})$/;

const host = globalThis.location?.hostname || 'localhost';

/** En el PC o en la red local se usa el Worker de desarrollo (`npm run dev` en worker/). */
export const WORKER_URL = LOCAL_HOST.test(host) ? `ws://${host}:8787` : PRODUCTION_URL;
