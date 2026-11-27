// ESPECIAL: MONTONERA. Grita (bocadillo) y sus colegas entran saltando desde los dos lados
// de la pantalla y caen en plancha, uno tras otro, sobre el sitio donde estaba el rival al
// llamarlos. Ese sitio queda fijo y una sombra lo marca: se esquiva saliendo de ahí antes de
// que caiga el primero (`flight` s). Al caer celebran y se van.
// A diferencia de `gang` (corren por el suelo y se saltan), aquí vienen por el aire.
// params: startup, recovery, interval (s entre saltos), flight (s en el aire), height (altura
//         del salto), spread (separación de los aterrizajes), width (zona de golpe),
//         finisher (fracción del daño del último), crew: [{ art?, body?, size? }]
import { STAGE, clamp } from '../../config.js';
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

class Jumper {
  constructor(owner, sp, i, tx) {
    const p = sp.params;
    const n = p.crew.length;
    this.owner = owner;
    this.sp = sp;
    this.last = i === n - 1;
    // alternan lados; el último sale de detrás del lanzador
    const side = this.last ? -owner.facing : i % 2 ? 1 : -1;
    this.x0 = side > 0 ? STAGE.right + 90 : STAGE.left - 90;
    const off = this.last ? 0 : ((i % 2 ? 1 : -1) * (p.spread ?? 26) * (1 + Math.floor(i / 2))) / 2;
    this.tx = clamp(tx + off, STAGE.left + 30, STAGE.right - 30);
    this.dir = this.tx >= this.x0 ? 1 : -1;
    this.delay = i * (p.interval ?? 0.16);
    this.t = 0;
    this.x = this.x0;
    this.y = 0;
    this.landT = -1;
    this.dangerous = true;
    this.dead = false;
    const b = new Fighter(crewLook(owner.cfg, p.crew[i]), owner.side);
    b.facing = this.dir;
    b.x = this.x;
    b.onGround = false;
    b.animT = i * 0.7;
    b.expression = () => (this.landT < 0 ? 'attack' : 'win');
    b.animName = () => (this.landT < 0 ? (this.k < 0.45 ? 'jumpUp' : 'slamDown') : this.t - this.landT < 0.55 ? 'win' : 'headRun');
    this.body = b;
    this.k = 0;
  }

  update(dt, world) {
    const p = this.sp.params;
    this.t += dt;
    const b = this.body;
    b.animT += dt;
    if (this.t < this.delay) return;
    const T = p.flight ?? 0.7;
    if (this.landT < 0) {
      this.k = Math.min(1, (this.t - this.delay) / T);
      const k = this.k;
      this.x = this.x0 + (this.tx - this.x0) * k;
      this.y = -4 * (p.height ?? 260) * k * (1 - k);
      if (k >= 1) this.land(world);
    } else {
      const since = this.t - this.landT;
      if (since > 0.55) {
        // se vuelven corriendo por donde vinieron
        if (b.facing === this.dir) b.facing = -this.dir;
        this.x += b.facing * 620 * dt;
        b.walkPhase += 620 * dt * 0.035;
        const out = b.facing > 0 ? this.x > STAGE.right + 80 : this.x < STAGE.left - 80;
        if (out) this.dead = true;
      }
    }
    b.x = this.x;
    b.y = this.y;
    b.onGround = this.landT >= 0;
    b.animate(dt);
  }

  land(world) {
    const p = this.sp.params;
    this.landT = this.t;
    this.y = 0;
    this.dangerous = false;
    const opp = world.opponentOf(this.owner);
    const dir = opp.x === this.tx ? this.dir : opp.x > this.tx ? 1 : -1;
    const W = p.width ?? 130;
    const n = p.crew.length;
    const fin = p.finisher ?? 0.4;
    const spec = this.last
      ? specialHit(this.sp, { dir, damage: this.sp.damage * fin, knockback: { x: 480, y: -720 } })
      : specialHit(this.sp, {
        dir, damage: (this.sp.damage * (1 - fin)) / (n - 1),
        knockback: { x: 60, y: -120 }, hitstun: 0.4, invuln: 0, hitstop: 0.04, shake: 6, power: 1, text: null,
      });
    world.tryHit(this.owner, opp, { x: this.tx - W / 2, y: -130, w: W, h: 130 }, spec);
    world.camera.shake(this.last ? 16 : 6);
    world.fx.dust(this.x - 30, 0, 4, -1);
    world.fx.dust(this.x + 30, 0, 4, 1);
    if (this.last) world.fx.ring(this.x, 0, this.sp.fx?.color2 || '#1f9e5a', 200, 0.4, true);
    if (!world.silent) (this.last ? sfx.boom() : sfx.land());
  }

  draw(ctx) {
    // sombra que avisa del aterrizaje
    if (this.landT < 0) {
      const k = this.t < this.delay ? 0 : this.k;
      ctx.save();
      ctx.fillStyle = `rgba(20,10,30,${0.18 + 0.3 * k})`;
      ctx.beginPath();
      ctx.ellipse(this.tx, 2, 24 + 22 * k, 6 + 3 * k, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (this.t >= this.delay) drawFighter(ctx, this.body);
  }
}

export default {
  start(f, sp, world, a) {
    a.s.called = false;
  },
  update(f, sp, world, dt, a) {
    const p = sp.params;
    if (!a.s.called && a.t >= p.startup) {
      a.s.called = true;
      const opp = world.opponentOf(f);
      const tx = clamp(opp.x, STAGE.left + 40, STAGE.right - 40);
      p.crew.forEach((_, i) => world.spawn(new Jumper(f, sp, i, tx)));
      world.camera.shake(6);
    }
    return a.t >= p.startup + p.recovery;
  },
  pose(f, a, sp) {
    return a.t < sp.params.startup ? 'callWind' : 'callGo';
  },
};
