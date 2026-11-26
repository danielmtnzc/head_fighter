// Efectos de sonido sintetizados con WebAudio (sin archivos). Sustituibles por samples.
let ac = null;
let master = null;
let muted = false;

export function initAudio() {
  if (ac) {
    if (ac.state === 'suspended') ac.resume();
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  master = ac.createGain();
  master.gain.value = 0.5;
  master.connect(ac.destination);
}

export function setMuted(m) {
  muted = m;
}
export function isMuted() {
  return muted;
}

function tone({ type = 'square', f = 440, f2 = null, dur = 0.1, vol = 0.2, delay = 0 }) {
  if (!ac || muted) return;
  const t = ac.currentTime + delay;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

let noiseBuf = null;
function noise({ dur = 0.1, vol = 0.3, freq = 1200, delay = 0, q = 0.8 }) {
  if (!ac || muted) return;
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = ac.currentTime + delay;
  const src = ac.createBufferSource();
  src.buffer = noiseBuf;
  const fl = ac.createBiquadFilter();
  fl.type = 'lowpass';
  fl.frequency.value = freq;
  fl.Q.value = q;
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(fl).connect(g).connect(master);
  src.start(t);
  src.stop(t + dur + 0.02);
}

export const sfx = {
  swing() {
    noise({ dur: 0.09, vol: 0.12, freq: 2600 });
  },
  hit(power = 1) {
    noise({ dur: 0.1 + power * 0.04, vol: 0.35 + power * 0.1, freq: 1500 - power * 250 });
    tone({ type: 'sine', f: 190 - power * 25, f2: 50, dur: 0.12 + power * 0.04, vol: 0.4 });
  },
  jump() {
    tone({ type: 'square', f: 300, f2: 620, dur: 0.12, vol: 0.08 });
  },
  land() {
    noise({ dur: 0.07, vol: 0.14, freq: 500 });
  },
  special() {
    tone({ type: 'sawtooth', f: 180, f2: 920, dur: 0.32, vol: 0.16 });
    tone({ type: 'square', f: 360, f2: 1400, dur: 0.3, vol: 0.07, delay: 0.04 });
  },
  boom() {
    noise({ dur: 0.5, vol: 0.6, freq: 420 });
    tone({ type: 'sine', f: 120, f2: 30, dur: 0.5, vol: 0.5 });
  },
  shoot() {
    noise({ dur: 0.25, vol: 0.25, freq: 900 });
    tone({ type: 'sawtooth', f: 520, f2: 140, dur: 0.25, vol: 0.14 });
  },
  whistle() {
    tone({ type: 'sine', f: 1500, f2: 2500, dur: 0.16, vol: 0.22 });
    tone({ type: 'sine', f: 2500, f2: 1300, dur: 0.24, vol: 0.22, delay: 0.17 });
  },
  glass() {
    noise({ dur: 0.25, vol: 0.4, freq: 9000, q: 4 });
    [2100, 2900, 3700].forEach((f, i) => tone({ type: 'triangle', f, f2: f * 0.8, dur: 0.12, vol: 0.12, delay: i * 0.04 }));
  },
  splash() {
    noise({ dur: 0.45, vol: 0.4, freq: 700, q: 3 });
    tone({ type: 'sawtooth', f: 170, f2: 70, dur: 0.4, vol: 0.14 });
  },
  inhale() {
    // calada: chisporroteo suave de la brasa
    noise({ dur: 0.5, vol: 0.12, freq: 3800, q: 2 });
  },
  exhale() {
    // soplido largo de humo
    noise({ dur: 0.7, vol: 0.32, freq: 900, q: 0.6 });
    tone({ type: 'sine', f: 140, f2: 90, dur: 0.5, vol: 0.08 });
  },
  shotgun() {
    noise({ dur: 0.05, vol: 0.5, freq: 5000 });
    noise({ dur: 0.3, vol: 0.45, freq: 1100 });
    tone({ type: 'sine', f: 520, f2: 70, dur: 0.16, vol: 0.45 });
  },
  ko() {
    tone({ type: 'sawtooth', f: 440, f2: 60, dur: 0.9, vol: 0.22 });
    noise({ dur: 0.6, vol: 0.4, freq: 600 });
  },
  beep() {
    tone({ type: 'square', f: 520, dur: 0.14, vol: 0.14 });
  },
  go() {
    tone({ type: 'square', f: 780, dur: 0.1, vol: 0.16 });
    tone({ type: 'square', f: 1040, dur: 0.35, vol: 0.16, delay: 0.1 });
  },
  select() {
    tone({ type: 'square', f: 660, f2: 880, dur: 0.07, vol: 0.1 });
  },
  win() {
    [523, 659, 784, 1046].forEach((f, i) => tone({ type: 'square', f, dur: 0.16, vol: 0.13, delay: i * 0.12 }));
  },
};
