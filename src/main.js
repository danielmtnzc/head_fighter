// Arranque y flujo de pantallas: título → selección → VS → combate → resultado.
import { VIEW_H } from './config.js';
import { ROSTER } from './characters/roster.js';
import { groupBadges } from './characters/groups.js';
import { preloadHeads, drawHead } from './characters/heads.js';
import { Match } from './engine/match.js';
import { initAudio, sfx, setMuted, isMuted } from './engine/audio.js';
import { KeyboardController, MergedController, SCHEMES, clearPressed } from './input/keyboard.js';
import { TouchControls } from './input/touch.js';
import { AIController } from './ai/ai.js';
import { Hud } from './ui/hud.js';
import { SelectScreen } from './ui/select.js';
import azotea from './stages/azotea.js';

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d');
const view = { w: 960, h: VIEW_H, scale: 1, groundY: VIEW_H * 0.8 };

const hud = new Hud();
const select = new SelectScreen(ROSTER);
const touch = new TouchControls($('touch'));
const screens = ['title', 'select', 'vs', 'result', 'pause'];

let isTouch = window.matchMedia('(pointer: coarse)').matches;
let state = 'title'; // title | select | vs | fight | result
let match = null;
let paused = false;
let choice = null;
let flowToken = 0; // invalida temporizadores de un combate anterior

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
    hooks: {
      onBanner: (text, kind) => {
        hud.showBanner(text, kind);
        if (kind === 'go') {
          clearPressed();
          touch.reset();
        }
      },
      onDamage: (side) => hud.damage(side),
      onEnd: (result) => token === flowToken && showResult(result),
    },
  });
  hud.bind(match);
  hud.clearBanner();

  // presentación VS
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
    showHint(mode);
    match.startCountdown();
  }, 2100);
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
  if (result.winner < 0) {
    title.textContent = '¡EMPATE!';
    title.style.color = '#fff';
    sub.textContent = 'Se acabó el tiempo y nadie cede';
  } else {
    const cfg = match.fighters[result.winner].cfg;
    const cpuWon = choice.mode === 'cpu' && result.winner === 1;
    title.textContent = `¡${cfg.name} GANA!`;
    title.style.color = cfg.color;
    const how = result.reason === 'ko' ? 'por K.O.' : 'por tiempo';
    sub.textContent = choice.mode === 'cpu' ? (cpuWon ? `Derrota ${how}… ¡pide la revancha!` : `¡Victoria ${how}!`) : `Jugador ${result.winner + 1} vence ${how}`;
  }
  setState('result');
  show('result');
}

function toTitle() {
  flowToken++;
  paused = false;
  hud.clearBanner();
  setState('title');
  show('title');
  startAttract();
}

function togglePause(force) {
  if (state !== 'fight') return;
  paused = force ?? !paused;
  show(paused ? 'pause' : null);
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
  setState('title');
  show('title');
});
click('btn-fight', () => {
  choice = select.choice;
  startMatch();
});
click('btn-rematch', startMatch);
click('btn-change', () => {
  flowToken++;
  setState('select');
  show('select');
  startAttract();
});
click('btn-menu', toTitle);
click('btn-pause', () => togglePause());
click('btn-resume', () => togglePause(false));
click('btn-quit', toTitle);
click('btn-mute', () => {
  setMuted(!isMuted());
  $('btn-mute').classList.toggle('off', isMuted());
});
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

window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') togglePause();
  if (e.code === 'Enter' && state === 'title') $('btn-play').click();
});
document.addEventListener('visibilitychange', () => document.hidden && togglePause(true));
document.addEventListener('contextmenu', (e) => e.preventDefault());

// ------------------------------------------------------------ bucle principal
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;

  if (!paused) match.advance(dt);
  ctx.setTransform(view.scale, 0, 0, view.scale, 0, 0);
  match.draw(ctx, view);

  if (state === 'fight') {
    if (!paused) hud.update(match, dt);
    if (isTouch) touch.setCharge(match.fighters[0].energy / 100);
  } else if (state === 'select') {
    select.tick(dt);
  }
  requestAnimationFrame(frame);
}

show('title');
setState('title');
startAttract();
requestAnimationFrame(frame);

// Acceso para depuración desde la consola
window.HF = { get match() { return match; }, ROSTER };
