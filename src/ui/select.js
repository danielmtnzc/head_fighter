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
    this.online = null; // { side, onPick, locked } mientras se elige para una partida online
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
      <div class="picks-wrap"><div class="picks"></div></div>`;
    const picks = el.querySelector('.picks');
    const buttons = this.roster.map((cfg, i) => {
      const b = document.createElement('button');
      b.className = 'pick';
      b.style.setProperty('--pc', cfg.color);
      b.innerHTML = '<canvas width="192" height="192"></canvas>';
      b.addEventListener('click', () => {
        const o = this.online;
        if (o && (side !== o.side || o.locked)) return; // el rival elige en su móvil
        this.picks[side] = i;
        sfx.select();
        this.refresh(side);
        o?.onPick(i);
      });
      picks.appendChild(b);
      return b;
    });
    // avisa de que hay más retratos a los lados
    const hints = () => {
      const max = picks.scrollWidth - picks.clientWidth;
      picks.parentElement.classList.toggle('more-l', picks.scrollLeft > 4);
      picks.parentElement.classList.toggle('more-r', picks.scrollLeft < max - 4);
    };
    picks.addEventListener('scroll', hints, { passive: true });
    // en el ordenador, la rueda del ratón también desliza la fila
    picks.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      picks.scrollLeft += e.deltaY;
      e.preventDefault();
    });
    new ResizeObserver(hints).observe(picks);
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
    return { el, buttons, tabs, picks, hints, ctx: el.querySelector('.preview').getContext('2d'), fighter: null };
  }

  showGroup(side, id) {
    const s = this.sides[side];
    s.tabs.forEach((b, i) => b.classList.toggle('on', GROUPS[i].id === id));
    s.buttons.forEach((b, i) => b.classList.toggle('hidden', !groupsOf(this.roster[i]).some((g) => g.id === id)));
    s.picks.scrollLeft = 0;
    s.hints();
  }

  refresh(side) {
    const s = this.sides[side];
    const cfg = this.roster[this.picks[side]];
    s.el.style.setProperty('--c', cfg.color);
    const mine = side === (this.online?.side ?? 0);
    s.el.querySelector('h3').textContent = mine ? 'TÚ' : this.online || this.mode === 'cpu' ? 'RIVAL' : 'JUGADOR 2';
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

  /** Entra en la selección online manejando el lado `side`; con null vuelve a la local. */
  setOnline(side, pick, onPick) {
    if (side === null) {
      if (!this.online) return;
      this.online = null;
      this.picks = this.localPicks;
    } else {
      if (!this.online) this.localPicks = [...this.picks];
      this.online = { side, onPick, locked: false };
      this.picks[side] = pick;
    }
    const on = !!this.online;
    this.root.classList.toggle('online', on);
    this.root.querySelector('#btn-back').textContent = on ? '◀ SALIR' : '◀ VOLVER';
    this.root.querySelector('#btn-fight').textContent = on ? '¡LISTO!' : '¡A PELEAR!';
    this.sides.forEach((s, i) => {
      s.el.classList.toggle('rival', on && i !== side);
      s.el.classList.remove('ready');
      this.refresh(i);
      this.showPick(i);
    });
  }

  /** Estado que llega de la partida online. */
  sync({ picks, ready }) {
    const o = this.online;
    if (!o) return;
    this.sides.forEach((s, i) => {
      if (picks[i] !== undefined && picks[i] !== this.picks[i]) {
        this.picks[i] = picks[i];
        this.refresh(i);
        this.showPick(i);
      }
      s.el.classList.toggle('ready', !!ready[i]);
    });
    o.locked = !!ready[o.side];
    this.root.querySelector('#btn-fight').textContent = o.locked ? 'CANCELAR' : '¡LISTO!';
  }

  /** Muestra el grupo en el que está el personaje elegido. */
  showPick(side) {
    this.showGroup(side, groupsOf(this.roster[this.picks[side]])[0]?.id ?? GROUPS[0].id);
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
