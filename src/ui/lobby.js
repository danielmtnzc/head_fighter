// Pantalla online: menú (crear o unirse) y espera en la sala. Solo DOM.
import { parseCode } from '../net/signaling.js';

export class Lobby {
  /** @param onJoin (código) → unirse a esa sala */
  constructor(onJoin) {
    this.root = document.getElementById('screen-online');
    this.menuEl = this.root.querySelector('.on-menu');
    this.roomEl = this.root.querySelector('.on-room');
    this.statusEl = this.root.querySelector('.on-status');
    this.input = this.root.querySelector('#room-input');
    this.shareBtn = this.root.querySelector('#btn-share');
    this.shareBtn.addEventListener('click', () => this.share());
    this.root.querySelector('#form-join').addEventListener('submit', (e) => {
      e.preventDefault();
      const code = parseCode(this.input.value);
      this.input.blur();
      if (code) onJoin(code);
      else this.status('El código son 4 letras');
    });
  }

  menu(message = '') {
    this.menuEl.classList.remove('hidden');
    this.roomEl.classList.add('hidden');
    this.shareBtn.classList.add('hidden');
    this.status(message);
  }

  waiting() {
    this.menuEl.classList.add('hidden');
    this.roomEl.textContent = '';
    this.shareBtn.classList.add('hidden');
    this.status('');
  }

  room(code) {
    this.roomEl.textContent = code;
    this.roomEl.classList.remove('hidden');
    this.shareBtn.classList.remove('hidden');
  }

  /** Comparte el enlace de la sala; si el navegador no deja, lo muestra para copiarlo. */
  async share() {
    const url = `${location.origin}${location.pathname}?sala=${this.roomEl.textContent}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Head Fighter', text: '¡Pelea conmigo!', url });
      else {
        await navigator.clipboard.writeText(url);
        this.status('Enlace copiado');
      }
    } catch (e) {
      if (e.name !== 'AbortError') this.status(url);
    }
  }

  status(text) {
    this.statusEl.textContent = text;
  }

  prefill(code) {
    this.input.value = code;
    this.status('Pulsa UNIRSE para entrar en la sala');
  }
}
