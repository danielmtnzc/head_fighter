// Bloquea el zoom de Safari en iOS: ignora `user-scalable=no` y `touch-action` no siempre frena el doble toque.
const DOUBLE_TAP_MS = 400;

export function blockZoom() {
  const opts = { passive: false };
  // botones de menú: usan `click`, así que no se puede cancelar su primer toque
  const menuButton = (el) => el.closest?.('button:not(.tbtn)');
  let lastEnd = -Infinity;

  // fuera de los botones de menú no hace falta ningún gesto nativo (los controles usan Pointer Events)
  document.addEventListener('touchstart', (e) => {
    if (e.cancelable && !menuButton(e.target)) e.preventDefault();
  }, opts);

  document.addEventListener('touchend', (e) => {
    const quick = e.timeStamp - lastEnd < DOUBLE_TAP_MS;
    lastEnd = e.timeStamp;
    const b = menuButton(e.target);
    if (!quick || !b || !e.cancelable) return;
    // segundo toque rápido: se cancela el zoom y se lanza el click a mano para no perder la pulsación
    e.preventDefault();
    const t = e.changedTouches[0];
    if (b.contains(document.elementFromPoint(t.clientX, t.clientY))) b.click();
  }, opts);

  // pellizco (eventos propios de Safari) y doble clic
  for (const type of ['gesturestart', 'gesturechange', 'dblclick']) {
    document.addEventListener(type, (e) => e.preventDefault(), opts);
  }
}
