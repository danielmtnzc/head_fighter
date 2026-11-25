// Entidad luchador: estado, movimiento, ataques y animación.
// No sabe nada de un personaje concreto: todo lo lee de su configuración (cfg).
import { BASE_SPEED, BASE_JUMP, approach } from '../config.js';
import { MOVES } from '../combat/moves.js';
import { SPECIALS } from '../combat/specials/index.js';
import { makePose, targetPose, lerpPose } from './poses.js';
import { sfx } from '../engine/audio.js';

const NEUTRAL = { x: 0, jump: false, punch: false, kick: false, special: false };
const BUFFER = 0.14; // segundos que se recuerda una pulsación
const DIZZY_SPEED = 0.7; // velocidad al andar mareado

export class Fighter {
  constructor(cfg, side = 0) {
    this.cfg = cfg;
    this.side = side; // 0 = izquierda, 1 = derecha
    this.controller = null;
    this.pose = makePose();
    this.reset();
  }

  reset() {
    this.x = this.side === 0 ? -210 : 210;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.facing = this.side === 0 ? 1 : -1;
    this.onGround = true;
    this.noGravity = false;
    this.hp = this.maxHp;
    this.energy = 40;
    this.state = 'idle'; // idle | hurt | ko | win | lose
    this.action = null; // ataque en curso
    this.hurtT = 0;
    this.invulnT = 0;
    this.dizzyT = 0; // mareado: controles invertidos y más lento
    this.flashT = 0;
    this.animT = Math.random() * 3;
    this.walkPhase = 0;
    this.intro = false;
    this.buf = { jump: 0, punch: 0, kick: 0, special: 0 };
  }

  get maxHp() {
    return this.cfg.stats.health;
  }

  /** Aspecto actual: el suyo o el de una transformación en curso (a.s.form). */
  get look() {
    return this.action?.s?.form || this.cfg;
  }

  get canAct() {
    return !this.action && this.state === 'idle';
  }

  update(dt, world) {
    this.animT += dt;
    this.invulnT = Math.max(0, this.invulnT - dt);
    this.flashT = Math.max(0, this.flashT - dt);
    this.dizzyT = Math.max(0, this.dizzyT - dt);

    const live = world.phase === 'fight';
    let inp = live && this.controller && this.state !== 'ko' ? this.controller.poll(this, world) : NEUTRAL;
    if (this.dizzyT > 0) inp = { ...inp, x: -inp.x * DIZZY_SPEED };
    for (const k in this.buf) this.buf[k] = inp[k] ? BUFFER : Math.max(0, this.buf[k] - dt);
    if (live) this.energy = Math.min(100, this.energy + (100 / this.cfg.special.cooldown) * dt);

    const opp = world.opponentOf(this);
    if (this.state === 'hurt') {
      this.hurtT -= dt;
      if (this.hurtT <= 0 && this.onGround) this.state = 'idle';
    }

    if (this.canAct) {
      if (opp && this.onGround && Math.abs(opp.x - this.x) > 6) this.facing = opp.x > this.x ? 1 : -1;
      const target = inp.x * BASE_SPEED * this.cfg.stats.speed;
      this.vx = approach(this.vx, target, (this.onGround ? 3600 : 1900) * dt);
      if (this.onGround) this.walkPhase += Math.abs(this.vx) * dt * 0.05;

      if (this.onGround && this.buf.jump > 0) {
        this.buf.jump = 0;
        this.vy = -BASE_JUMP * this.cfg.stats.jump;
        this.onGround = false;
        world.fx.dust(this.x, 0, 5);
        sfx.jump();
      }
      if (this.buf.special > 0 && this.energy >= 100) this.startSpecial(world);
      else if (this.buf.kick > 0) this.startMove('kick');
      else if (this.buf.punch > 0) this.startMove('punch');
    } else if (this.onGround && !this.action?.keepVel) {
      // fricción cuando no se controla (golpeado, atacando, K.O.)
      this.vx = approach(this.vx, 0, (this.state === 'ko' ? 1100 : 1800) * dt);
    }

    const a = this.action;
    if (a) {
      a.t += dt;
      if (a.kind === 'special') {
        if (a.handler.update(this, a.sp, world, dt, a)) this.endAction();
      } else {
        const m = a.move;
        if (!a.hit && a.t >= m.startup && a.t < m.startup + m.active) {
          const hb = m.hitbox;
          const box = { x: this.facing > 0 ? this.x + hb.x : this.x - hb.x - hb.w, y: this.y + hb.y, w: hb.w, h: hb.h };
          const spec = { ...m.hit, damage: m.hit.damage * this.cfg.stats.power };
          if (world.tryHit(this, opp, box, spec)) a.hit = true;
        }
        if (a.t >= m.startup + m.active + m.recovery) this.endAction();
      }
    }
  }

  startMove(name) {
    const move = MOVES[name];
    this.buf[name] = 0;
    this.action = { kind: name, move, t: 0, hit: false };
    if (this.onGround) this.vx = this.facing * move.lunge;
    sfx.swing();
  }

  startSpecial(world) {
    const sp = this.cfg.special;
    const handler = SPECIALS[sp.type];
    if (!handler) return console.warn(`Tipo de especial desconocido: ${sp.type}`);
    this.buf.special = 0;
    this.energy = 0;
    this.action = { kind: 'special', sp, handler, t: 0, s: {}, keepVel: false };
    handler.start(this, sp, world, this.action);
    world.onSpecialStart(this, sp);
  }

  endAction() {
    this.action = null;
    this.noGravity = false;
  }

  /** Aplica un golpe ya confirmado por el sistema de combate. */
  takeHit(spec, dir) {
    this.hp = Math.max(0, this.hp - spec.damage);
    if (this.action?.kind === 'special') this.action.handler.cancel?.(this, this.action);
    this.endAction();
    const w = this.cfg.stats.weight;
    this.vx = (dir * spec.knockback.x) / w;
    if (spec.knockback.y) {
      this.vy = spec.knockback.y / w;
      this.onGround = false;
    }
    this.flashT = 0.1;
    if (spec.dizzy) this.dizzyT = Math.max(this.dizzyT, spec.dizzy);
    if (this.hp <= 0) {
      this.dizzyT = 0;
      this.state = 'ko';
      this.vx = dir * 520;
      this.vy = -760;
      this.onGround = false;
      this.invulnT = 999;
    } else {
      this.state = 'hurt';
      this.hurtT = spec.hitstun;
      this.invulnT = spec.invuln ?? spec.hitstun + 0.14;
    }
  }

  onLand(world, bounce) {
    world.fx.dust(this.x, 0, bounce || this.state === 'ko' ? 10 : 5);
    sfx.land();
    if (this.state === 'ko') world.camera.shake(7);
    // un ataque básico aéreo se corta al aterrizar
    if (this.action && this.action.kind !== 'special') this.endAction();
    this.pose.sx = 1.16;
    this.pose.sy = 0.84;
  }

  expression() {
    if (this.state === 'ko') return 'ko';
    if (this.state === 'hurt' || this.state === 'lose') return 'hurt';
    if (this.dizzyT > 0 && !this.action) return 'hurt';
    if (this.state === 'win') return 'win';
    if (this.action) return 'attack';
    return 'idle';
  }

  /** Nombre de la pose que corresponde al estado actual. */
  animName() {
    if (this.state === 'ko') return this.onGround ? 'koDown' : 'koAir';
    if (this.state === 'win') return 'win';
    if (this.state === 'lose') return 'lose';
    if (this.state === 'hurt') return this.onGround ? 'hurt' : 'hurtAir';
    const a = this.action;
    if (a) {
      if (a.kind === 'special') return a.handler.pose(this, a, a.sp);
      const m = a.move;
      if (a.t < m.startup) return a.kind + 'Wind';
      if (a.t < m.startup + m.active + 0.05) return a.kind + 'Hit';
      return 'recover';
    }
    if (!this.onGround) return this.vy < 0 ? 'jumpUp' : 'jumpDown';
    if (Math.abs(this.vx) > 30) return 'walk';
    return this.intro ? 'intro' : 'idle';
  }

  /** Avanza la animación (interpolación de pose). Se llama una vez por paso. */
  animate(dt) {
    const [tgt, rate] = targetPose(this);
    lerpPose(this.pose, tgt, Math.min(1, rate * dt));
  }
}
