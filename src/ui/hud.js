// HUD de combate (DOM): retratos, nombres, barras de vida con "fantasma" de daño,
// energía del especial, temporizador y rótulos (3, 2, 1, ¡PELEA!, ¡K.O.!).
import { drawHead } from '../characters/heads.js';

export class Hud {
  constructor() {
    this.root = document.getElementById('hud');
    this.timer = this.root.querySelector('.timer');
    this.banner = document.getElementById('banner');
    this.sides = [...this.root.querySelectorAll('.hud-side')].map((el) => ({
      el,
      ctx: el.querySelector('.portrait').getContext('2d'),
      name: el.querySelector('.name'),
      fill: el.querySelector('.hp-fill'),
      ghost: el.querySelector('.hp-ghost'),
      en: el.querySelector('.en'),
      enFill: el.querySelector('.en-fill'),
      enLabel: el.querySelector('.en-label'),
      ghostV: 1,
      delay: 0,
    }));
  }

  show(on) {
    this.root.classList.toggle('hidden', !on);
  }

  bind(match) {
    match.fighters.forEach((f, i) => {
      const s = this.sides[i];
      s.el.style.setProperty('--c', f.cfg.color);
      s.name.textContent = f.cfg.name;
      s.enLabel.textContent = f.cfg.special.name;
      s.ghostV = 1;
      s.delay = 0;
    });
  }

  /** Animación de golpe en la barra del jugador `side`. */
  damage(side) {
    const s = this.sides[side];
    s.delay = 0.45;
    s.el.classList.remove('hit');
    void s.el.offsetWidth; // reinicia la animación CSS
    s.el.classList.add('hit');
  }

  showBanner(text, kind = 'count') {
    const b = this.banner;
    b.className = '';
    b.textContent = text;
    void b.offsetWidth;
    b.className = `show ${kind}`;
  }

  clearBanner() {
    this.banner.className = '';
  }

  update(match, dt) {
    match.fighters.forEach((f, i) => {
      const s = this.sides[i];
      const r = f.hp / f.maxHp;
      s.fill.style.transform = `scaleX(${r})`;
      s.fill.classList.toggle('mid', r <= 0.5 && r > 0.25);
      s.fill.classList.toggle('low', r <= 0.25);
      // la barra blanca "fantasma" baja con retraso para que se vea el daño recibido
      if (s.delay > 0) s.delay -= dt;
      else if (s.ghostV > r) s.ghostV = Math.max(r, s.ghostV - dt * 0.7);
      if (s.ghostV < r) s.ghostV = r;
      s.ghost.style.transform = `scaleX(${s.ghostV})`;
      s.enFill.style.transform = `scaleX(${f.energy / 100})`;
      s.en.classList.toggle('ready', f.energy >= 100);

      const c = s.ctx;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, 120, 120);
      c.translate(60, 66);
      if (i === 1) c.scale(-1, 1);
      c.translate(-4, 0);
      drawHead(c, f.cfg, 40, f.expression(), f.animT, 1);
    });
    const t = Math.ceil(match.time);
    this.timer.textContent = t;
    this.timer.classList.toggle('low', t <= 10 && match.phase === 'fight');
  }
}
