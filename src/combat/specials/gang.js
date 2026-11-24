// ESPECIAL: PANDILLA. Silba y una cuadrilla llega corriendo por detrás y arrolla al rival.
// Cada uno pega una vez; el último remata. Se pueden saltar.
// params: startup, recovery, speed, gap, behind, finisher (fracción del daño del último),
//         crew: [{ art?, body?, size? }] (cambios sobre el aspecto del luchador)
import { STAGE, rand } from '../../config.js';
import { Fighter } from '../../characters/fighter.js';
import { drawFighter } from '../../characters/fighterRenderer.js';
import { specialHit } from './common.js';
import { sfx } from '../../engine/audio.js';

function crewLook(cfg, m) {
  return {
    ...cfg,
    head: { ...cfg.head, size: m.size || cfg.head.size, art: { ...cfg.head.art, ...m.art } },
    body: { ...cfg.body, ...m.body },
  };
}

class Runner {
  constructor(owner, sp, i) {
    const p = sp.params;
    this.owner = owner;
    this.sp = sp;
    this.last = i === p.crew.length - 1;
    this.dir = owner.facing;
    this.x = owner.x - this.dir * (p.behind + i * p.gap);
    this.y = 0;
    this.vx = this.dir * p.speed;
    this.dangerous = true;
    this.dead = false;
    this.hit = false;
    this.punchT = 0;
    // muñeco sin control: solo se usa para dibujar
    const b = new Fighter(crewLook(owner.cfg, p.crew[i]), owner.side);
    b.facing = this.dir;
    b.x = this.x;
    b.walkPhase = i * 1.7;
    b.expression = () => 'attack';
    b.animName = () => (this.punchT > 0 ? 'flurryA' : 'headRun');
    this.body = b;
  }

  update(dt, world) {
    this.x += this.vx * dt;
    this.punchT = Math.max(0, this.punchT - dt);
    const b = this.body;
    b.x = this.x;
    b.walkPhase += Math.abs(this.vx) * dt * 0.035;
    b.animT += dt;
    b.animate(dt);
    if (Math.random() < 0.2) world.fx.dust(this.x - this.dir * 20, 0, 1, -this.dir);

    if (!this.hit) {
      const { finisher = 0.4, crew } = this.sp.params;
      const box = { x: this.dir > 0 ? this.x - 10 : this.x - 50, y: -72, w: 60, h: 72 };
      const spec = this.last
        ? specialHit(this.sp, { dir: this.dir, damage: this.sp.damage * finisher, knockback: { x: 620, y: -480 } })
        : specialHit(this.sp, {
          dir: this.dir, damage: (this.sp.damage * (1 - finisher)) / (crew.length - 1),
          knockback: { x: 120, y: 0 }, hitstun: 0.32, invuln: 0, hitstop: 0.03, shake: 4, power: 1, text: null,
        });
      if (world.tryHit(this.owner, world.opponentOf(this.owner), box, spec)) {
        this.hit = true;
        this.punchT = 0.22;
        if (this.last) sfx.boom();
        else sfx.swing();
      }
    }
    const edge = this.dir > 0 ? STAGE.right - this.x : this.x - STAGE.left;
    if (edge < -60) {
      this.dead = true;
      world.fx.dust(this.x, -30, 6);
    }
  }

  draw(ctx) {
    drawFighter(ctx, this.body);
  }
}

export default {
  start(f, sp, world, a) {
    a.s.called = false;
    a.s.whistled = false;
  },
  update(f, sp, world, dt, a) {
    const p = sp.params;
    if (!a.s.whistled) {
      a.s.whistled = true;
      sfx.whistle();
    }
    if (!a.s.called && a.t >= p.startup) {
      a.s.called = true;
      p.crew.forEach((_, i) => world.spawn(new Runner(f, sp, i)));
      for (let i = 0; i < 6; i++) world.fx.dust(f.x - f.facing * rand(120, 260), 0, 2, f.facing);
      world.camera.shake(8);
    }
    return a.t >= p.startup + p.recovery;
  },
  pose(f, a, sp) {
    return a.t < sp.params.startup ? 'callWind' : 'callGo';
  },
};
