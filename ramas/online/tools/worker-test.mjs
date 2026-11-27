// Prueba de las salas en local, sin cuenta de Cloudflare:
//   1) arrancar el Worker con plazos cortos (desde worker/):
//        npx wrangler dev --port 8788 --var SEAT_MS:1500 LONELY_MS:3000 EMPTY_MS:3000
//          HELLO_MS:2000 WATCH_MS:1000 STALE_MS:12000
//      (o la configuración `salas-prueba` de .claude/launch.json)
//   2) node tools/worker-test.mjs [ws://localhost:8788]
import { Signaling, randomCode, parseCode } from '../src/net/signaling.js';
import { PROTO } from '../src/net/config.js';

const URL_BASE = process.argv[2] || 'ws://localhost:8788';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FALLO'} ${name}${ok ? '' : ` ${detail}`}`);
};

/** WebSocket a pelo con cola de mensajes. Manda pings solo, salvo con `mute`. */
function socket(code, options, mute = false) {
  const ws = new WebSocket(`${URL_BASE}/sala/${code}`, options);
  const queue = [];
  const waiting = [];
  let wantPong = false;
  const pinger = mute ? null : setInterval(() => ws.readyState === WebSocket.OPEN && ws.send('ping'), 2000);
  ws.onclose = () => clearInterval(pinger);
  ws.onmessage = (e) => {
    if (e.data === 'pong') {
      if (!wantPong) return;
      wantPong = false;
    }
    const msg = e.data === 'pong' ? { t: 'pong' } : JSON.parse(e.data);
    const w = waiting.shift();
    if (w) w(msg);
    else queue.push(msg);
  };
  const open = new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = () => rej(new Error('no se puede conectar: ¿está arrancado el Worker?'));
  });
  return {
    ws,
    open,
    next: (ms = 3000) =>
      queue.length
        ? Promise.resolve(queue.shift())
        : new Promise((res) => {
          const w = (msg) => {
            clearTimeout(timer);
            res(msg);
          };
          const timer = setTimeout(() => {
            waiting.splice(waiting.indexOf(w), 1);
            res({ t: 'nada' });
          }, ms);
          waiting.push(w);
        }),
    say: (msg) => {
      if (msg === 'ping') wantPong = true;
      ws.send(typeof msg === 'string' ? msg : JSON.stringify(msg));
    },
  };
}

async function hello(code, rol, extra = {}, options) {
  const s = socket(code, options);
  await s.open;
  if (!options) s.say({ t: 'hola', v: PROTO, rol, ...extra });
  s.reply = await s.next();
  return s;
}

const is = (msg, t, code) => msg.t === t && (!code || msg.code === code);
const show = (msg) => JSON.stringify(msg);

const code = randomCode();
const host = await hello(code, 'crear');
check('crear da el asiento 0', is(host.reply, 'sala') && host.reply.asiento === 0 && host.reply.code === code, show(host.reply));

const taken = await hello(code, 'crear');
check('crear una sala en uso da "ocupada"', is(taken.reply, 'error', 'ocupada'), show(taken.reply));
const missing = await hello(randomCode(), 'unirse');
check('un código sin sala da "no-existe"', is(missing.reply, 'error', 'no-existe'), show(missing.reply));
const old = await hello(randomCode(), 'crear', { v: PROTO + 1 });
check('otra versión da "version"', is(old.reply, 'error', 'version'), show(old.reply));
const evil = await hello(randomCode(), 'crear', {}, { headers: { origin: 'https://ejemplo.com' } });
check('una web ajena da "origen"', is(evil.reply, 'error', 'origen'), show(evil.reply));
const pages = socket(randomCode(), { headers: { origin: 'https://danielmtnzc.github.io' } });
await pages.open;
pages.say({ t: 'hola', v: PROTO, rol: 'crear' });
check('la web publicada puede entrar', is(await pages.next(), 'sala'));
pages.say({ t: 'adios' });

const guest = await hello(code, 'unirse');
check('unirse da el asiento 1', is(guest.reply, 'sala') && guest.reply.asiento === 1, show(guest.reply));
const [a, b] = [await host.next(), await guest.next()];
check('los dos reciben "emparejados" con STUN', [a, b].every((m) => is(m, 'emparejados') && /^stun:/.test(m.ice[0].urls[0])), show([a, b]));
check('con el mismo número de ronda', a.ronda === 1 && b.ronda === 1, show([a.ronda, b.ronda]));

host.say({ t: 'senal', data: { sdp: 'oferta' } });
const offer = await guest.next();
guest.say({ t: 'senal', data: { sdp: 'respuesta' } });
const answer = await host.next();
check('las señales se reenvían en los dos sentidos', offer.data?.sdp === 'oferta' && answer.data?.sdp === 'respuesta');
host.say('ping');
check('"ping" se contesta', is(await host.next(), 'pong'));
host.say('{basura');
host.say({ t: 'senal', data: 'x'.repeat(20000) });
check('basura y mensajes enormes se ignoran', is(await guest.next(500), 'nada'));

const third = await hello(code, 'unirse');
check('un tercero recibe "llena"', is(third.reply, 'error', 'llena'), show(third.reply));

guest.ws.close();
const dropped = await host.next();
check('al caer uno, el otro se entera', is(dropped, 'rival-fuera') && dropped.definitivo === false, show(dropped));
const intruder = await hello(code, 'unirse');
check('el asiento se guarda unos segundos', is(intruder.reply, 'error', 'llena'), show(intruder.reply));
const forged = await hello(code, 'unirse', { token: 'inventado' });
check('un token desconocido da "caducada"', is(forged.reply, 'error', 'caducada'), show(forged.reply));
const back = await hello(code, 'unirse', { token: guest.reply.token });
check('con el token se recupera el asiento', is(back.reply, 'sala') && back.reply.asiento === 1, show(back.reply));
const re = [await host.next(), await back.next()];
check('y vuelven a emparejarse en otra ronda', re.every((m) => is(m, 'emparejados') && m.ronda === 2), show(re));

back.ws.close();
await host.next();
await sleep(2000);
const late = await hello(code, 'unirse');
check('pasado el plazo, otro puede ocupar el asiento', is(late.reply, 'sala') && late.reply.asiento === 1, show(late.reply));
await host.next();
await late.next();
late.say({ t: 'adios' });
const bye = await host.next();
check('"adios" avisa de que es definitivo', is(bye, 'rival-fuera') && bye.definitivo === true, show(bye));
const expired = await hello(code, 'unirse', { token: late.reply.token });
check('el token de quien se fue ya no sirve', is(expired.reply, 'error', 'caducada'), show(expired.reply));
const again = await hello(code, 'unirse');
check('y libera el asiento al momento', is(again.reply, 'sala'), show(again.reply));
await host.next();
await again.next();
await sleep(4000);
host.say('ping');
check('con dos jugadores la sala no caduca', is(await host.next(), 'pong'));
again.say({ t: 'adios' });
await host.next();
check('un jugador solo acaba en "caducada"', is(await host.next(6000), 'error', 'caducada'));
const gone = await hello(code, 'unirse');
check('la sala caducada deja de existir', is(gone.reply, 'error', 'no-existe'), show(gone.reply));

const idle = socket(randomCode());
await idle.open;
check('una conexión sin "hola" se cierra', is(await idle.next(5000), 'error', 'caducada'));
const spam = await hello(randomCode(), 'crear');
for (let i = 0; i < 120; i++) spam.say({ t: 'senal', data: i });
check('una ráfaga de mensajes da "abuso"', is(await spam.next(), 'error', 'abuso'));
const quietCode = randomCode();
const talker = await hello(quietCode, 'crear');
const silent = socket(quietCode, undefined, true);
await silent.open;
silent.say({ t: 'hola', v: PROTO, rol: 'unirse' });
await talker.next(); // emparejados
const dead = await talker.next(20000);
check('una conexión muda se da por caída', is(dead, 'rival-fuera') && dead.definitivo === false, show(dead));
talker.say({ t: 'adios' });

// cliente del juego (signaling.js)
function client(options) {
  const events = [];
  const record = (name) => (value) => events.push([name, value]);
  const s = new Signaling({
    url: URL_BASE,
    ...options,
    on: Object.fromEntries(['sala', 'emparejados', 'senal', 'rivalFuera', 'reconectando', 'error'].map((n) => [n, record(n)])),
  });
  s.got = async (name, ms = 3000) => {
    for (let t = 0; t < ms; t += 20) {
      const i = events.findIndex((e) => e[0] === name);
      if (i >= 0) return { value: events.splice(i, 1)[0][1] };
      await sleep(20);
    }
    return null;
  };
  return s;
}

const one = client();
one.create();
const room = await one.got('sala');
check('Signaling crea sala', room && parseCode(room.value.code.toLowerCase()) === room.value.code);
const two = client();
two.join(room.value.code);
check('Signaling se une y se emparejan', !!(await two.got('sala')) && !!(await one.got('emparejados')) && !!(await two.got('emparejados')));
one.signal({ n: 1 });
check('Signaling reenvía señales', (await two.got('senal'))?.value.n === 1);
two.ws.close(); // corte
check('Signaling reconecta tras un corte', !!(await two.got('reconectando')) && (await two.got('sala'))?.value.asiento === 1 && !!(await two.got('emparejados')));
// conexión medio abierta: parece viva pero ya no llega nada
const half = client({ pingMs: 300, pongMs: 600 });
half.create();
await half.got('sala');
half.ws.send = () => {};
half.ws.onmessage = () => {};
check('Signaling detecta una conexión muerta y vuelve', !!(await half.got('reconectando')) && (await half.got('sala'))?.value.asiento === 0);
half.leave();
const busy = client();
busy.role = 'crear';
busy.code = room.value.code;
busy.open();
const other = await busy.got('sala');
check('Signaling cambia de código si está ocupado', other && other.value.code !== room.value.code);
const lost = client();
lost.join(randomCode());
check('Signaling informa del error', (await lost.got('error'))?.value === 'no-existe');
one.leave();
two.leave();
busy.leave();

console.log(failures ? `${failures} FALLOS` : 'OK');
process.exit(failures ? 1 : 0);
