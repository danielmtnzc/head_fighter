// Controles de teclado. Dos esquemas para jugar dos personas en el mismo ordenador.
const down = new Set();
const pressed = new Set(); // pulsaciones pendientes de consumir

export const SCHEMES = {
  p1: { left: ['KeyA'], right: ['KeyD'], jump: ['KeyW', 'Space'], punch: ['KeyJ'], kick: ['KeyK'], special: ['KeyL'] },
  p2: {
    left: ['ArrowLeft'], right: ['ArrowRight'], jump: ['ArrowUp'],
    // teclado numérico y, para portátiles sin él, las teclas , . -
    punch: ['Numpad1', 'Comma'], kick: ['Numpad2', 'Period'], special: ['Numpad3', 'Slash'],
  },
};

const GAME_KEYS = new Set(Object.values(SCHEMES).flatMap((s) => Object.values(s).flat()));

window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement) return; // escribiendo, p. ej. el código de sala
  if (GAME_KEYS.has(e.code)) e.preventDefault();
  if (e.repeat) return;
  down.add(e.code);
  pressed.add(e.code);
});
window.addEventListener('keyup', (e) => down.delete(e.code));
window.addEventListener('blur', () => {
  down.clear();
  pressed.clear();
});

/** Olvida las pulsaciones acumuladas (p. ej. durante la cuenta atrás). */
export function clearPressed() {
  pressed.clear();
}

const held = (codes) => codes.some((c) => down.has(c));
function take(codes) {
  let hit = false;
  for (const c of codes) if (pressed.delete(c)) hit = true;
  return hit;
}

export class KeyboardController {
  constructor(scheme) {
    this.s = scheme;
  }
  poll() {
    const s = this.s;
    return {
      x: (held(s.right) ? 1 : 0) - (held(s.left) ? 1 : 0),
      jump: take(s.jump),
      punch: take(s.punch),
      kick: take(s.kick),
      special: take(s.special),
    };
  }
}

/** Combina varias fuentes de entrada (teclado + táctil) para un mismo jugador. */
export class MergedController {
  constructor(...sources) {
    this.sources = sources;
  }
  poll(f, world) {
    const out = { x: 0, jump: false, punch: false, kick: false, special: false };
    for (const s of this.sources) {
      const i = s.poll(f, world);
      if (Math.abs(i.x) > Math.abs(out.x)) out.x = i.x;
      out.jump ||= i.jump;
      out.punch ||= i.punch;
      out.kick ||= i.kick;
      out.special ||= i.special;
    }
    return out;
  }
}
