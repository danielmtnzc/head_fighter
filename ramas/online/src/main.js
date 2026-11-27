// Arranque y flujo de pantallas: título → selección → VS → combate → resultado.
import { VIEW_H } from './config.js';
import { ROSTER } from './characters/roster.js';
import { groupBadges } from './characters/groups.js';
import { preloadHeads, drawHead } from './characters/heads.js';
import { Match } from './engine/match.js';
import { initAudio, sfx, setMuted, isMuted } from './engine/audio.js';
import { KeyboardController, MergedController, SCHEMES, clearPressed } from './input/keyboard.js';
import { TouchControls } from './input/touch.js';
import { blockZoom } from './input/noZoom.js';
import { AIController } from './ai/ai.js';
import { Hud } from './ui/hud.js';
import { SelectScreen } from './ui/select.js';
import { Lobby } from './ui/lobby.js';
import { OnlineGame, ERRORS } from './net/online.js';
import { parseCode } from './net/signaling.js';
import azotea from './stages/azotea.js';

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d');
const view = { w: 960, h: VIEW_H, scale: 1, groundY: VIEW_H * 0.8 };

const selStatus = document.querySelector('.sel-status');
const resStatus = document.querySelector('.res-status');
const hud = new Hud();
const select = new SelectScreen(ROSTER);
const touch = new TouchControls($('touch'));
const lobby = new Lobby((code) => {
  initAudio();
  sfx.select();
  startOnline(code);
});
const screens = ['title', 'select', 'online', 'vs', 'result', 'pause'];
const params = new URLSearchParams(location.search);
const debug = params.has('debug');

let isTouch = window.matchMedia('(pointer: coarse)').matches;
let state = 'title'; // title | select | online | vs | fight | result
let online = null; // partida online en curso (OnlineGame)
let match = null;
let paused = false;
let choice = null;
let flowToken = 0; // invalida temporizadores de un combate anterior

blockZoom();
preloadHeads(ROSTER);

// ------------------------------------------------------------ pantalla
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  view.scale = canvas.height / VIEW_H;
  view.w = canvas.width / view.scale;
  // en táctil el suelo sube un poco para que los controles no tapen a los luchadores
  view.groundY = VIEW_H * (isTouch ? 0.75 : 0.8);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);
resize();

function show(name) {
  for (const s of screens) $(`screen-${s}`).classList.toggle('hidden', s !== name);
}

function setState(s) {
  state = s;
  const fighting = s === 'fight';
  hud.show(fighting);
  $('touch').classList.toggle('hidden', !(fighting && isTouch));
  $('hint').classList.add('hidden');
}

// Si se toca la pantalla en un dispositivo que no se detectó como táctil, activa los controles.
window.addEventListener('touchstart', () => {
  if (isTouch) return;
  isTouch = true;
  resize();
  if (state === 'fight') $('touch').classList.remove('hidden');
}, { passive: true });

// ------------------------------------------------------------ combates
const randomCfg = () => ROSTER[Math.floor(Math.random() * ROSTER.length)];

/** Combate de demostración (IA contra IA) de fondo en los menús. */
function startAttract() {
  const a = randomCfg();
  let b = randomCfg();
  if (ROSTER.length > 1) while (b === a) b = randomCfg();
  const token = flowToken;
  match = new Match({
    cfgs: [a, b],
    controllers: [new AIController(1), new AIController(1)],
    stage: azotea,
    silent: true,
    hooks: { onEnd: () => token === flowToken && state !== 'fight' && startAttract() },
  });
  match.startCountdown();
}

/** Avisos del combate hacia la interfaz. */
function matchHooks({ onGo, onEnd } = {}) {
  return {
    onBanner: (text, kind) => {
      hud.showBanner(text, kind);
      if (kind === 'go') onGo?.();
    },
    onDamage: (side) => hud.damage(side),
    onEnd,
  };
}

/** Presentación VS; al terminar se llama a `then`. */
function showVs(cfgs, then) {
  const token = flowToken;
  const vs = $('screen-vs');
  vs.querySelectorAll('.vs-panel').forEach((p, i) => {
    const cfg = cfgs[i];
    p.style.setProperty('--c', cfg.color);
    p.querySelector('.vs-name').textContent = cfg.name;
    p.querySelector('.vs-tag').textContent = cfg.tagline || '';
    p.querySelector('.vs-badges').innerHTML = groupBadges(cfg);
    const c = p.querySelector('canvas').getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, 300, 300);
    c.translate(140, 165);
    drawHead(c, cfg, 100, 'attack', 0, 1);
  });
  setState('vs');
  show('vs');
  sfx.special();

  setTimeout(() => {
    if (token !== flowToken) return;
    show(null);
    setState('fight');
    then();
  }, 2100);
}

function startMatch() {
  const token = ++flowToken;
  paused = false;
  const { mode, level, cfgs } = choice;
  const p1 = new MergedController(new KeyboardController(SCHEMES.p1), touch);
  const p2 = mode === '2p' ? new KeyboardController(SCHEMES.p2) : new AIController(level);
  match = new Match({
    cfgs,
    controllers: [p1, p2],
    stage: azotea,
    hooks: matchHooks({
      onGo: () => {
        clearPressed();
        touch.reset();
      },
      onEnd: (result) => token === flowToken && showResult(result),
    }),
  });
  hud.bind(match);
  hud.clearBanner();
  showVs(cfgs, () => {
    showHint(mode);
    match.startCountdown();
  });
}

// ------------------------------------------------------------ online
function openOnline(message = '') {
  setState('online');
  show('online');
  lobby.menu(message);
}

/** @param code sala a la que unirse; sin él se crea una */
function startOnline(code) {
  leaveOnline();
  const game = new OnlineGame({
    controller: new MergedController(new KeyboardController(SCHEMES.p1), touch),
    // el resultado lo avisa OnlineGame, cuando el rival ya tiene todo lo necesario
    matchOpts: () => ({ stage: azotea, hooks: matchHooks() }),
    pickFor: (side) => select.picks[side],
    on: {
      status: (text) => lobby.status(text),
      code: (c) => lobby.room(c),
      screen: (phase) => onlineScreen(game, phase),
      change: renderOnline,
      end: (error) => {
        online = null;
        select.setOnline(null);
        flowToken++;
        hud.clearBanner();
        openOnline(ERRORS[error] || ERRORS.conexion);
        startAttract();
      },
    },
  });
  online = game;
  lobby.waiting();
  if (code) game.join(code);
  else game.create();
}

function leaveOnline() {
  online?.leave();
  online = null;
  select.setOnline(null);
}

/** La partida online pide cambiar de pantalla. */
function onlineScreen(game, phase) {
  flowToken++;
  paused = false;
  hud.clearBanner();
  if (phase === 'select') {
    startAttract();
    select.setOnline(game.side, game.pick, (i) => game.setPick(i));
    setState('select');
    show('select');
    renderOnline();
  } else if (phase === 'vs') {
    match = game.match;
    hud.bind(match, game.side);
    touch.reset();
    showVs(match.fighters.map((f) => f.cfg), () => {
      clearPressed();
      showHint('cpu');
      game.ready();
    });
  } else showResult(game.verdict);
}

/** Refresca lo que depende del rival en la pantalla actual. */
function renderOnline() {
  if (!online) return;
  if (state === 'select') select.sync(online.selection);
  else if (state === 'result') {
    for (const id of ['btn-rematch', 'btn-change']) $(id).classList.toggle('hidden', online.rivalGone);
    $('btn-rematch').disabled = online.wantsRematch;
    $('btn-rematch').textContent = online.wantsRematch ? 'ESPERANDO…' : 'REVANCHA';
  }
}

const setText = (el, text) => {
  if (el.textContent !== text) el.textContent = text;
};

/** Avisos online, que cambian con el tiempo. */
function onlineTexts() {
  const notice = online?.notice ?? '';
  const net = online && state === 'fight' ? [notice, debug ? online.debug : ''].filter(Boolean).join('\n') : '';
  setText($('net'), net);
  if (online && state === 'select') setText(selStatus, notice || (online.isReady ? 'Esperando a tu rival…' : 'Elige tu luchador'));
  setText(resStatus, online && state === 'result' ? notice || (online.rivalWantsRematch ? '¡Tu rival quiere la revancha!' : '') : '');
}

function showHint(mode) {
  if (isTouch) return;
  const h = $('hint');
  const k = (s) => `<b>${s}</b>`;
  let html = `<div>${mode === '2p' ? 'J1: ' : ''}${k('A')}${k('D')} mover · ${k('W')} salto · ${k('J')} puño · ${k('K')} patada · ${k('L')} especial</div>`;
  if (mode === '2p') html += `<div>J2: ${k('←')}${k('→')} mover · ${k('↑')} salto · ${k('Num1')} puño · ${k('Num2')} patada · ${k('Num3')} especial <small>(o , . -)</small></div>`;
  h.innerHTML = html;
  h.classList.remove('hidden');
  h.style.animation = 'none';
  void h.offsetWidth;
  h.style.animation = '';
}

function showResult(result) {
  const title = $('screen-result').querySelector('.res-title');
  const sub = $('screen-result').querySelector('.res-sub');
  for (const id of ['btn-rematch', 'btn-change']) $(id).classList.remove('hidden');
  $('btn-rematch').disabled = false;
  $('btn-rematch').textContent = 'REVANCHA';
  if (result.winner < 0) {
    title.textContent = '¡EMPATE!';
    title.style.color = '#fff';
    sub.textContent = 'Se acabó el tiempo y nadie cede';
  } else {
    const cfg = match.fighters[result.winner].cfg;
    const cpuWon = !online && choice.mode === 'cpu' && result.winner === 1;
    title.textContent = `¡${cfg.name} GANA!`;
    title.style.color = cfg.color;
    const how = { ko: 'por K.O.', time: 'por tiempo', abandono: 'por abandono' }[result.reason];
    if (online) sub.textContent = result.winner === online.side ? `¡Victoria ${how}!` : `Derrota ${how}`;
    else sub.textContent = choice.mode === 'cpu' ? (cpuWon ? `Derrota ${how}… ¡pide la revancha!` : `¡Victoria ${how}!`) : `Jugador ${result.winner + 1} vence ${how}`;
  }
  setState('result');
  show('result');
  renderOnline();
}

function toTitle() {
  leaveOnline();
  flowToken++;
  paused = false;
  hud.clearBanner();
  setState('title');
  show('title');
  startAttract();
}

/** En local pausa el combate; online (donde no hay pausa) pregunta si se quiere salir. */
function togglePause(force) {
  if (state !== 'fight') return;
  const open = force ?? $('screen-pause').classList.contains('hidden');
  paused = open && !online;
  $('screen-pause').querySelector('h2').textContent = online ? '¿SALIR?' : 'PAUSA';
  $('btn-resume').textContent = online ? 'SEGUIR' : 'CONTINUAR';
  $('btn-quit').textContent = online ? 'SALIR (PIERDES)' : 'SALIR AL MENÚ';
  show(open ? 'pause' : null);
}

// ------------------------------------------------------------ botones
const click = (id, fn) =>
  $(id).addEventListener('click', () => {
    initAudio();
    sfx.select();
    fn();
  });

click('btn-play', () => {
  setState('select');
  show('select');
});
click('btn-back', () => {
  if (online) {
    leaveOnline();
    openOnline();
    startAttract();
    return;
  }
  setState('title');
  show('title');
});
click('btn-fight', () => {
  if (online) return online.toggleReady();
  choice = select.choice;
  startMatch();
});
click('btn-rematch', () => (online ? online.rematch() : startMatch()));
click('btn-change', () => {
  if (online) return online.change();
  flowToken++;
  setState('select');
  show('select');
  startAttract();
});
click('btn-menu', toTitle);
click('btn-online', () => openOnline());
click('btn-create', () => startOnline());
click('btn-online-back', () => {
  // desde una sala se vuelve al menú online; desde el menú, al título
  if (online) {
    leaveOnline();
    openOnline();
  } else {
    setState('title');
    show('title');
  }
});
click('btn-pause', () => togglePause());
click('btn-resume', () => togglePause(false));
click('btn-quit', toTitle);
click('btn-mute', () => {
  setMuted(!isMuted());
  $('btn-mute').classList.toggle('off', isMuted());
});
// iPhone no permite pantalla completa en páginas web: se oculta el botón
$('btn-full').classList.toggle('hidden', !document.documentElement.requestFullscreen);
click('btn-full', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else {
      await document.documentElement.requestFullscreen();
      await screen.orientation?.lock?.('landscape');
    }
  } catch {
    /* no disponible en este navegador */
  }
});

// al cerrar o salir de la página se abandona la partida; si el navegador la recupera, se avisa
let leftByPagehide = false;
window.addEventListener('pagehide', () => {
  leftByPagehide = !!online;
  leaveOnline();
});
window.addEventListener('pageshow', (e) => {
  if (!e.persisted || !leftByPagehide) return;
  flowToken++;
  hud.clearBanner();
  openOnline(ERRORS.perdida);
  startAttract();
});
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') togglePause();
  if (e.code === 'Enter' && state === 'title') $('btn-play').click();
});
document.addEventListener('visibilitychange', () => {
  if (!online) {
    if (document.hidden) togglePause(true);
    return;
  }
  if (!document.hidden) {
    clearPressed();
    touch.reset();
  }
  online.setHidden(document.hidden);
});
document.addEventListener('contextmenu', (e) => e.preventDefault());

// ------------------------------------------------------------ bucle principal
let last = performance.now();
function frame(now) {
  const elapsed = (now - last) / 1000;
  const dt = Math.min(0.1, elapsed);
  last = now;

  // el combate online avanza al ritmo de los mandos de los dos, dentro de update()
  online?.update(elapsed);
  if (!(online && match === online.match) && !paused) match.advance(dt);
  ctx.setTransform(view.scale, 0, 0, view.scale, 0, 0);
  match.draw(ctx, view);

  if (state === 'fight') {
    if (!paused) hud.update(match, dt);
    if (isTouch) touch.setCharge(match.fighters[online?.side ?? 0].energy / 100);
  } else if (state === 'select') {
    select.tick(dt);
  }
  setText($('btn-pause'), online ? '✕' : 'II');
  onlineTexts();
  requestAnimationFrame(frame);
}

show('title');
setState('title');
startAttract();
requestAnimationFrame(frame);
// enlace a una sala: …/?sala=ABCD
const invited = parseCode(params.get('sala') || '');
if (invited) {
  openOnline();
  lobby.prefill(invited);
  // para que al recargar no vuelva a una sala vieja
  params.delete('sala');
  history.replaceState(null, '', params.size ? `?${params}` : location.pathname);
}

// Acceso para depuración desde la consola
window.HF = { get match() { return match; }, get online() { return online; }, ROSTER };
