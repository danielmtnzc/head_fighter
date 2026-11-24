// Pantalla de selección: modo de juego, dificultad y luchador de cada lado.
// Se construye a partir de la plantilla (roster), así los personajes nuevos aparecen solos.
import { Fighter } from '../characters/fighter.js';
import { drawFighterPreview } from '../characters/fighterRenderer.js';
import { drawHead } from '../characters/heads.js';
import { GROUPS, groupsOf, groupBadges } from '../characters/groups.js';
import { sfx } from '../engine/audio.js';

const STATS = [['VIDA', 'health', 180], ['VELOCIDAD', 'speed', 1.35], ['FUERZA', 'power', 1.3], ['SALTO', 'jump', 1.2]];

export class SelectScreen {
  constructor(roster) {
    this.roster = roster;
    this.root = document.getElementById('screen-select');
    this.mode = 'cpu';
    this.level = 1;
    this.picks = [0, Math.min(1, roster.length - 1)];
    this.sides = [...this.root.querySelectorAll('.sel-side')].map((el, side) => this.buildSide(el, side));

    this.root.querySelectorAll('[data-mode]').forEach((b) =>
      b.addEventListener('click', () => {
        this.mode = b.dataset.mode;
        this.root.querySelectorAll('[data-mode]').forEach((o) => o.classList.toggle('on', o === b));
        this.root.querySelector('.diff').style.visibility = this.mode === 'cpu' ? 'visible' : 'hidden';
        sfx.select();
        this.refresh(1);
      }),
    );
    this.root.querySelectorAll('[data-level]').forEach((b) =>
      b.addEventListener('click', () => {
        this.level = Number(b.dataset.level);
        this.root.querySelectorAll('[data-level]').forEach((o) => o.classList.toggle('on', o === b));
        sfx.select();
      }),
    );
    this.refresh(0);
    this.refresh(1);
    this.picks.forEach((i, side) => this.showGroup(side, groupsOf(roster[i])[0]?.id ?? GROUPS[0].id));
  }

  buildSide(el, side) {
    el.innerHTML = `
      <div class="sel-head"><h3></h3><div class="groups"></div></div>
      <div class="sel-main">
        <div class="pv"><canvas class="preview" width="504" height="576"></canvas><div class="badges"></div></div>
        <div class="info">
          <div class="nm"></div><div class="tag"></div>
          <div class="stats">${STATS.map(([l]) => `<div class="stat"><span>${l}</span><i><b></b></i></div>`).join('')}</div>
          <div class="sp"></div><div class="spd"></div>
        </div>
      </div>
      <div class="picks"></div>`;
    const picks = el.querySelector('.picks');
    const buttons = this.roster.map((cfg, i) => {
      const b = document.createElement('button');
      b.className = 'pick';
      b.style.setProperty('--pc', cfg.color);
      b.innerHTML = '<canvas width="192" height="192"></canvas>';
      b.addEventListener('click', () => {
        this.picks[side] = i;
        sfx.select();
        this.refresh(side);
      });
      picks.appendChild(b);
      return b;
    });
    // pestañas de grupo: filtran los luchadores que se ven, sin cambiar el elegido
    const tabs = GROUPS.map((g) => {
      const b = document.createElement('button');
      b.textContent = g.name;
      b.style.setProperty('--gc', g.color);
      b.addEventListener('click', () => {
        sfx.select();
        this.showGroup(side, g.id);
      });
      el.querySelector('.groups').appendChild(b);
      return b;
    });
    return { el, buttons, tabs, ctx: el.querySelector('.preview').getContext('2d'), fighter: null };
  }

  showGroup(side, id) {
    const s = this.sides[side];
    s.tabs.forEach((b, i) => b.classList.toggle('on', GROUPS[i].id === id));
    s.buttons.forEach((b, i) => b.classList.toggle('hidden', !groupsOf(this.roster[i]).some((g) => g.id === id)));
  }

  refresh(side) {
    const s = this.sides[side];
    const cfg = this.roster[this.picks[side]];
    s.el.style.setProperty('--c', cfg.color);
    s.el.querySelector('h3').textContent = side === 0 ? 'TÚ' : this.mode === 'cpu' ? 'RIVAL' : 'JUGADOR 2';
    s.el.querySelector('.nm').textContent = cfg.name;
    s.el.querySelector('.badges').innerHTML = groupBadges(cfg);
    s.el.querySelector('.tag').textContent = cfg.tagline || '';
    s.el.querySelectorAll('.stat b').forEach((b, i) => {
      const [, key, max] = STATS[i];
      b.style.width = `${Math.min(100, (cfg.stats[key] / max) * 100)}%`;
    });
    s.el.querySelector('.sp').textContent = `★ ${cfg.special.name}`;
    s.el.querySelector('.spd').textContent = cfg.special.description || '';
    s.buttons.forEach((b, i) => b.classList.toggle('on', i === this.picks[side]));
    s.fighter = new Fighter(cfg, side);
  }

  get choice() {
    return { mode: this.mode, level: this.level, cfgs: this.picks.map((i) => this.roster[i]) };
  }

  /** Anima las vistas previas. */
  tick(dt) {
    this.sides.forEach((s) => {
      const f = s.fighter;
      f.animT += dt;
      f.animate(dt);
      const c = s.ctx;
      c.setTransform(2, 0, 0, 2, 0, 0); // el lienzo tiene el doble de resolución
      c.clearRect(0, 0, 252, 288);
      drawFighterPreview(c, f, 126, 270, 1.6);
      s.buttons.forEach((b, i) => {
        const pc = b.firstChild.getContext('2d');
        pc.setTransform(2, 0, 0, 2, 0, 0);
        pc.clearRect(0, 0, 96, 96);
        pc.translate(46, 54);
        drawHead(pc, this.roster[i], 30, i === this.picks[this.sides.indexOf(s)] ? 'win' : 'idle', f.animT, 1);
      });
    });
  }
}
