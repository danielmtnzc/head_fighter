// Un combate: es el "mundo" que comparten luchadores, proyectiles, efectos y cámara.
// Fases: intro → countdown → fight → ko → over
import { STEP, ROUND_TIME, rand } from '../config.js';
import { Fighter } from '../characters/fighter.js';
import { drawFighter, drawShadow } from '../characters/fighterRenderer.js';
import { integrate, separate } from '../physics/physics.js';
import { tryHit } from '../combat/combat.js';
import { Effects } from './effects.js';
import { Camera } from './camera.js';
import { sfx } from './audio.js';

const HIT_WORDS = ['¡ZAS!', '¡PUM!', '¡PAF!', '¡TOMA!', '¡CRAC!'];

export class Match {
  /**
   * @param cfgs        [configP1, configP2]
   * @param controllers [controlP1, controlP2] (objetos con poll(fighter, world))
   * @param stage       escenario
   * @param hooks       { onBanner(text, kind), onDamage(side), onEnd(result) }
   * @param silent      modo demostración (sin sonido ni rótulos)
   */
  constructor({ cfgs, controllers, stage, hooks = {}, silent = false }) {
    this.stage = stage;
    this.hooks = hooks;
    this.silent = silent;
    this.fighters = cfgs.map((c, i) => new Fighter(c, i));
    this.fighters.forEach((f, i) => {
      f.controller = controllers[i];
      f.intro = true;
    });
    this.entities = [];
    this.fx = new Effects();
    this.camera = new Camera();
    this.phase = 'intro';
    this.phaseT = 0;
    this.time = ROUND_TIME;
    this.hitstop = 0;
    this.timeScale = 1;
    this.acc = 0;
    this.result = null;
    this.count = -1;
    this.view = null;
    this.elapsed = 0;
  }

  // ------------------------------------------------------------ API de mundo
  opponentOf(f) {
    return this.fighters[1 - f.side];
  }
  spawn(e) {
    this.entities.push(e);
  }
  tryHit(att, def, box, spec) {
    return tryHit(this, att, def, box, spec);
  }

  onHit(att, def, spec, x, y) {
    const power = spec.power || 1;
    const color = spec.color || att.cfg.color;
    this.fx.impact(x, y, power, color);
    this.hitstop = Math.max(this.hitstop, spec.hitstop || 0);
    this.camera.shake(spec.shake || 0);
    const word = spec.text === undefined ? (power >= 2 ? HIT_WORDS[Math.floor(rand(HIT_WORDS.length))] : null) : spec.text;
    if (word && typeof word === 'string') this.fx.text(x, y - 46, word, color, power >= 3 ? 56 : 42);
    if (power >= 3) this.fx.flash('#fff', 0.3);
    if (!this.silent) sfx.hit(power);
    if (!spec.special) att.energy = Math.min(100, att.energy + spec.damage * 0.9);
    def.energy = Math.min(100, def.energy + spec.damage * 0.5);
    this.hooks.onDamage?.(def.side);
    if (def.hp <= 0) this.finish(att.side, 'ko');
  }

  onSpecialStart(f, sp) {
    // pausa dramática con el fondo oscurecido y el nombre del golpe
    this.hitstop = Math.max(this.hitstop, 0.28);
    this.fx.dim(0.55);
    this.fx.ring(f.x, f.y - 60, sp.fx?.color || f.cfg.color, 150, 0.4);
    this.fx.text(f.x, f.y - 170, sp.name.toUpperCase(), sp.fx?.color || f.cfg.color, 34);
    if (!this.silent) sfx.special();
  }

  // ------------------------------------------------------------ flujo
  startCountdown() {
    this.phase = 'countdown';
    this.phaseT = 0;
    this.count = -1;
  }

  finish(winner, reason) {
    if (this.phase !== 'fight') return;
    this.phase = 'ko';
    this.phaseT = 0;
    this.result = { winner, reason };
    if (reason === 'ko') {
      this.timeScale = 0.25;
      this.hitstop = 0.2;
      this.camera.focus = this.fighters[1 - winner];
      this.camera.shake(22);
      this.fx.flash('#fff', 0.7);
      this.hooks.onBanner?.('¡K.O.!', 'ko');
      if (!this.silent) sfx.ko();
    } else {
      this.hooks.onBanner?.('¡TIEMPO!', 'ko');
      this.fighters.forEach((f) => {
        f.endAction();
        if (winner === -1 || f.side !== winner) f.state = 'lose';
      });
    }
  }

  /** Avanza el combate con paso fijo. realDt en segundos. */
  advance(realDt) {
    this.acc += Math.min(realDt, 0.1) * this.timeScale;
    let n = 0;
    while (this.acc >= STEP && n++ < 8) {
      this.step(STEP);
      this.acc -= STEP;
    }
  }

  step(dt) {
    this.elapsed += dt;
    this.phaseT += dt;
    const [a, b] = this.fighters;

    if (this.phase === 'countdown') {
      const idx = Math.floor(this.phaseT / 0.72);
      if (idx !== this.count) {
        this.count = idx;
        if (idx < 3) {
          this.hooks.onBanner?.(String(3 - idx), 'count');
          if (!this.silent) sfx.beep();
        } else {
          this.hooks.onBanner?.('¡PELEA!', 'go');
          if (!this.silent) sfx.go();
          this.phase = 'fight';
          this.phaseT = 0;
          this.fighters.forEach((f) => (f.intro = false));
        }
      }
    }

    if (this.hitstop > 0) {
      // congelación de impacto: solo siguen vivos los efectos y la cámara
      this.hitstop -= dt;
      this.fx.update(dt * 0.5);
      if (this.view) this.camera.update(dt, this.fighters, this.view);
      return;
    }

    for (const f of this.fighters) f.update(dt, this);
    for (const f of this.fighters) {
      const ev = integrate(f, dt);
      if (ev) f.onLand(this, ev === 'bounce');
      f.animate(dt);
    }
    separate(a, b);

    for (const e of this.entities) e.update(dt, this);
    if (this.entities.some((e) => e.dead)) this.entities = this.entities.filter((e) => !e.dead);

    this.fx.update(dt);
    if (this.view) this.camera.update(dt, this.fighters, this.view);

    if (this.phase === 'fight') {
      this.time -= dt;
      if (this.time <= 0) {
        this.time = 0;
        const ra = a.hp / a.maxHp;
        const rb = b.hp / b.maxHp;
        this.finish(ra === rb ? -1 : ra > rb ? 0 : 1, 'time');
      }
    } else if (this.phase === 'ko') {
      const w = this.result.winner;
      if (this.result.reason === 'ko') {
        if (this.phaseT > 0.4) this.timeScale = 1;
        const loser = this.fighters[1 - w];
        const win = this.fighters[w];
        if (this.phaseT > 1.1 && loser.onGround && win.state !== 'win' && win.onGround) {
          win.endAction();
          win.state = 'win';
          win.vx = 0;
          this.camera.focus = win;
          if (!this.silent) sfx.win();
        }
      } else if (this.phaseT > 0.9 && w >= 0 && this.fighters[w].state !== 'win' && this.fighters[w].onGround) {
        this.fighters[w].state = 'win';
        this.fighters[w].vx = 0;
        this.camera.focus = this.fighters[w];
        if (!this.silent) sfx.win();
      }
      if (this.phaseT > 3.4) {
        this.phase = 'over';
        this.hooks.onEnd?.(this.result);
      }
    }
  }

  // ------------------------------------------------------------ dibujo
  draw(ctx, view) {
    if (!this.view) {
      this.view = view;
      this.camera.snap(this.fighters, view);
    }
    this.view = view;
    const cam = this.camera;
    this.stage.drawBackground(ctx, view, cam, this.elapsed);
    ctx.save();
    cam.apply(ctx, view);
    this.stage.drawFloor(ctx, view, cam);
    ctx.restore();

    this.fx.drawDim(ctx, view);

    ctx.save();
    cam.apply(ctx, view);
    for (const f of this.fighters) drawShadow(ctx, f);
    // el que ataca se dibuja encima
    const order = this.fighters[0].action && !this.fighters[1].action ? [1, 0] : [0, 1];
    for (const i of order) drawFighter(ctx, this.fighters[i]);
    for (const e of this.entities) e.draw(ctx);
    this.fx.draw(ctx);
    ctx.restore();

    this.fx.drawScreen(ctx, view);
  }
}
