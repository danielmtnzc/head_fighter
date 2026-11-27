// Controles táctiles multitáctiles con Pointer Events:
// joystick virtual a la izquierda (aparece donde apoyas el pulgar) y cuatro botones a la derecha.
// Cada dedo se sigue por su pointerId, así se puede mover y atacar a la vez.
import { clamp } from '../config.js';

export class TouchControls {
  constructor(root) {
    this.root = root;
    this.x = 0;
    this.pressed = new Set();
    this.zone = root.querySelector('#joy-zone');
    this.base = root.querySelector('#joy-base');
    this.knob = root.querySelector('#joy-knob');
    this.joyId = null;
    this.cx = 0;
    this.setupJoystick();
    this.setupButtons();
  }

  setupJoystick() {
    const z = this.zone;
    const move = (e) => {
      const r = this.base.offsetWidth / 2;
      const dx = clamp(e.clientX - this.cx, -r, r);
      this.knob.style.transform = `translate(${dx}px, 0)`;
      const v = dx / r;
      // zona muerta + respuesta rápida
      this.x = Math.abs(v) < 0.2 ? 0 : Math.sign(v) * Math.min(1, (Math.abs(v) - 0.2) / 0.45);
    };
    const end = (e) => {
      if (e.pointerId !== this.joyId) return;
      this.joyId = null;
      this.x = 0;
      this.knob.style.transform = '';
      this.base.style.left = '';
      this.base.style.top = '';
      this.base.classList.remove('active');
    };
    z.addEventListener('pointerdown', (e) => {
      if (this.joyId !== null) return;
      e.preventDefault();
      this.joyId = e.pointerId;
      try {
        z.setPointerCapture(e.pointerId);
      } catch {
        /* puntero no capturable */
      }
      // el joystick se centra donde se apoya el dedo
      const zr = z.getBoundingClientRect();
      const r = this.base.offsetWidth / 2;
      const bx = clamp(e.clientX - zr.left, r, zr.width - r);
      const by = clamp(e.clientY - zr.top, r, zr.height - r);
      this.base.style.left = `${bx - r}px`;
      this.base.style.top = `${by - r}px`;
      this.base.classList.add('active');
      this.cx = zr.left + bx;
      move(e);
    });
    z.addEventListener('pointermove', (e) => {
      if (e.pointerId === this.joyId) move(e);
    });
    z.addEventListener('pointerup', end);
    z.addEventListener('pointercancel', end);
    z.addEventListener('lostpointercapture', end);
  }

  setupButtons() {
    this.buttons = {};
    this.root.querySelectorAll('[data-act]').forEach((b) => {
      const act = b.dataset.act;
      this.buttons[act] = b;
      const up = () => b.classList.remove('down');
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.pressed.add(act);
        b.classList.add('down');
      });
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
      b.addEventListener('pointerleave', up);
      b.addEventListener('contextmenu', (e) => e.preventDefault());
    });
  }

  /** Actualiza el indicador de carga del botón especial (0..1). */
  setCharge(k) {
    const b = this.buttons.special;
    b.style.setProperty('--charge', `${Math.round(k * 360)}deg`);
    b.classList.toggle('ready', k >= 1);
  }

  reset() {
    this.pressed.clear();
    this.x = 0;
  }

  poll() {
    const p = this.pressed;
    return { x: this.x, jump: p.delete('jump'), punch: p.delete('punch'), kick: p.delete('kick'), special: p.delete('special') };
  }
}
