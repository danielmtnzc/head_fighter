// Cámara de juego de lucha lateral: encuadra a los dos luchadores, hace zoom
// según su distancia, no se sale del escenario y admite sacudidas.
import { STAGE, clamp, rand } from '../config.js';

export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.zoom = 1;
    this.shakeMag = 0;
    this.sx = 0;
    this.sy = 0;
    this.focus = null; // luchador a destacar (K.O.)
  }

  shake(mag) {
    this.shakeMag = Math.max(this.shakeMag, mag);
  }

  update(dt, fighters, view) {
    const [a, b] = fighters;
    let mid = (a.x + b.x) / 2;
    const dist = Math.abs(a.x - b.x);
    const worldW = STAGE.right - STAGE.left + STAGE.margin * 2;
    const minZ = view.w / worldW;
    let tz = clamp(view.w / (dist + 420), minZ, 1.12);
    if (this.focus) {
      tz = Math.min(1.3, tz * 1.2);
      mid = mid * 0.4 + this.focus.x * 0.6;
    }
    const halfW = view.w / 2 / tz;
    const limit = Math.max(0, STAGE.right + STAGE.margin - halfW);
    const tx = clamp(mid, -limit, limit);
    const ty = Math.min(a.y, b.y) * 0.22;

    this.x += (tx - this.x) * Math.min(1, dt * 6);
    this.y += (ty - this.y) * Math.min(1, dt * 5);
    this.zoom += (tz - this.zoom) * Math.min(1, dt * 4);

    this.shakeMag *= Math.exp(-dt * 9);
    if (this.shakeMag < 0.2) this.shakeMag = 0;
    this.sx = rand(-1, 1) * this.shakeMag;
    this.sy = rand(-1, 1) * this.shakeMag;
  }

  /** Coloca la cámara directamente (inicio de combate). */
  snap(fighters, view) {
    for (let i = 0; i < 60; i++) this.update(0.1, fighters, view);
    this.shakeMag = 0;
    this.sx = this.sy = 0;
  }

  apply(ctx, view) {
    ctx.translate(view.w / 2 + this.sx, view.groundY + this.sy - this.y * this.zoom);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, 0);
  }
}
