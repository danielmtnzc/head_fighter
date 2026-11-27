// IA del rival. Produce la misma entrada que un jugador ({x, jump, punch, kick, special}),
// así el motor no distingue entre humano y máquina.
// Decide cada pocas décimas según la distancia, con azar para no ser predecible:
// se acerca, tantea, retrocede, salta, ataca a su distancia y esquiva proyectiles.
import { STEP, STAGE, rand } from '../config.js';

export class AIController {
  /** @param level 0 fácil · 1 normal · 2 difícil */
  constructor(level = 1) {
    this.level = level;
    this.timer = rand(0.2, 0.5);
    this.moveX = 0;
    this.queue = null;
    this.airPlan = false;
    this.seen = new WeakSet();
  }

  poll(self, world) {
    const out = { x: 0, jump: false, punch: false, kick: false, special: false };
    const opp = world.opponentOf(self);
    const dx = opp.x - self.x;
    const d = Math.abs(dx);
    const dir = dx >= 0 ? 1 : -1;
    this.timer -= STEP;

    // esquivar proyectiles y ondas que vienen hacia mí
    for (const e of world.entities) {
      if (e.owner === self || !e.dangerous || this.seen.has(e)) continue;
      const ed = e.x - self.x;
      if (Math.abs(ed) < 200 && Math.sign(e.vx) === -Math.sign(ed)) {
        this.seen.add(e);
        if (self.onGround && Math.random() < 0.45 + 0.2 * this.level) out.jump = true;
      }
    }

    if (self.canAct && this.timer <= 0) this.decide(self, opp, d, dir);

    // patada aérea al caer sobre el rival
    if (this.airPlan && !self.onGround && self.canAct && d < 128 && self.vy > -150) {
      out.kick = true;
      this.airPlan = false;
    }
    if (this.queue && self.canAct) {
      out[this.queue] = true;
      this.queue = null;
    }
    out.x = this.moveX;
    return out;
  }

  decide(self, opp, d, dir) {
    const r = Math.random();
    const lv = this.level;
    const set = (x, tMin, tMax, queue = null) => {
      this.moveX = x;
      this.queue = queue;
      this.timer = rand(tMin, tMax) * (1.25 - lv * 0.2);
    };
    this.airPlan = false;
    if (opp.state === 'ko') return set(0, 0.3, 0.3);

    const wallBehind = dir > 0 ? self.x < STAGE.left + 120 : self.x > STAGE.right - 120;
    const ai = self.cfg.special.ai || { min: 0, max: 200 };
    if (self.energy >= 100 && d >= ai.min && d <= ai.max && opp.invulnT <= 0 && r < 0.3 + 0.15 * lv) {
      return set(0, 0.4, 0.7, 'special');
    }

    const threat = opp.action && d < 175;
    if (d > 290) {
      // lejos: acercarse, a veces saltando, a veces esperando
      if (r < 0.76) set(dir, 0.2, 0.45);
      else if (r < 0.9) { set(dir, 0.35, 0.5, 'jump'); this.airPlan = true; }
      else set(0, 0.15, 0.35);
    } else if (d > 128) {
      // media distancia: tantear
      if (threat && r < 0.3 && !wallBehind) set(-dir, 0.15, 0.3);
      else if (r < 0.5) set(dir, 0.1, 0.22);
      else if (r < 0.68) { set(dir, 0.35, 0.5, 'jump'); this.airPlan = true; }
      else if (r < 0.82 && !wallBehind) set(-dir, 0.15, 0.35);
      else set(0, 0.1, 0.25);
    } else {
      // cuerpo a cuerpo
      if (threat && r < 0.22 && !wallBehind) set(-dir, 0.2, 0.35, Math.random() < 0.5 ? 'jump' : null);
      else if (r < 0.42) set(0, 0.22, 0.4, 'punch');
      else if (r < 0.72) set(0, 0.3, 0.5, 'kick');
      else if (r < 0.84 && !wallBehind) set(-dir, 0.2, 0.4);
      else if (r < 0.92) set(wallBehind ? dir : -dir, 0.35, 0.5, 'jump');
      else set(0, 0.12, 0.3);
    }
  }
}
