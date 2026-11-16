// Biblioteca de poses. Una pose describe el esqueleto del personaje:
//   rot      rotación de todo el cuerpo alrededor de la cadera
//   dy       desplazamiento vertical extra
//   lean     inclinación del torso (positivo = hacia delante)
//   headTilt / headX / headY   cabeza respecto al torso
//   af / ab  brazo delantero / trasero  [ángulo hombro, flexión codo]
//   lf / lb  pierna delantera / trasera [ángulo cadera, flexión rodilla]
//   asF/asB/lsF/lsB  estiramiento "de goma" de brazos y piernas
//   sx / sy  aplastar y estirar
// Ángulos: 0 = hacia abajo, positivo = hacia delante (π/2 = horizontal al frente).
// El renderer interpola suavemente de la pose actual a la pose objetivo.

const BASE = {
  rot: 0, dy: 0, lean: 0.05, headTilt: 0, headX: 0, headY: 0,
  af: [0.55, 1.55], ab: [0.15, 1.75], lf: [0.3, -0.4], lb: [-0.35, -0.1],
  asF: 1, asB: 1, lsF: 1, lsB: 1, sx: 1, sy: 1,
};

const P = (o) => ({ ...BASE, ...o });

export function makePose() {
  return { ...BASE, af: [...BASE.af], ab: [...BASE.ab], lf: [...BASE.lf], lb: [...BASE.lb] };
}

export function lerpPose(cur, tgt, k) {
  for (const key in BASE) {
    const b = tgt[key];
    if (Array.isArray(b)) {
      cur[key][0] += (b[0] - cur[key][0]) * k;
      cur[key][1] += (b[1] - cur[key][1]) * k;
    } else {
      cur[key] += (b - cur[key]) * k;
    }
  }
}

// Poses estáticas con su velocidad de transición (rate, mayor = más seco).
const STATIC = {
  jumpUp: [P({ af: [2.3, 0.5], ab: [1.5, 0.9], lf: [1.1, -1.6], lb: [0.5, -1.3], sx: 0.95, sy: 1.07 }), 18],
  jumpDown: [P({ af: [1.9, 0.3], ab: [-1.2, -0.4], lf: [0.5, -0.5], lb: [-0.25, -0.3], headTilt: 0.05 }), 14],

  punchWind: [P({ lean: -0.12, af: [-0.6, 2.2], ab: [0.6, 1.5], headTilt: 0.05 }), 40],
  punchHit: [P({ lean: 0.3, af: [1.5, 0.05], asF: 2.4, ab: [-0.5, 1.3], lf: [0.55, -0.5], lb: [-0.65, 0.1], headTilt: -0.12, headX: 2 }), 55],
  kickWind: [P({ lean: -0.18, lf: [1.0, -1.8], af: [0.3, 1.2], ab: [-0.5, 1.0] }), 34],
  kickHit: [P({ lean: -0.38, lf: [1.9, 0], lsF: 3.6, lb: [-0.1, 0], af: [0.1, 1.0], ab: [-1.0, -0.5], headTilt: 0.18 }), 50],
  recover: [P({ lean: 0.1 }), 16],

  hurt: [P({ lean: -0.45, headTilt: -0.35, headX: -3, af: [1.2, 0.4], ab: [-1.0, -0.6], lf: [0.5, -0.2], lb: [0.1, -0.4] }), 45],
  hurtAir: [P({ rot: -0.55, lean: -0.3, headTilt: -0.3, af: [1.6, 0.3], ab: [-1.4, -0.4], lf: [0.9, -0.5], lb: [0.3, -0.8] }), 30],
  koAir: [P({ rot: -1.25, lean: -0.2, headTilt: -0.3, af: [2.2, 0.3], ab: [-2.0, -0.3], lf: [1.0, -0.4], lb: [0.2, -0.9] }), 22],
  koDown: [P({ rot: -Math.PI / 2, dy: -12, lean: 0, headTilt: 0.1, af: [2.6, 0.2], ab: [-2.4, -0.2], lf: [0.9, -0.5], lb: [0.3, 0.5] }), 20],
  lose: [P({ lean: 0.45, headTilt: 0.35, headY: 4, af: [0.05, 0.1], ab: [-0.1, 0.15], lf: [0.2, -0.5], lb: [-0.2, -0.2] }), 6],

  // --- poses de ataques especiales
  castWind: [P({ lean: -0.28, af: [-1.0, 1.9], ab: [-0.8, 1.6], lf: [0.5, -0.7], lb: [-0.5, -0.2], headTilt: 0.1 }), 26],
  castThrow: [P({ lean: 0.34, af: [1.55, 0], ab: [1.4, 0.1], asF: 1.7, asB: 1.6, lf: [0.7, -0.6], lb: [-0.7, 0.1], headTilt: -0.15 }), 55],
  dashCharge: [P({ lean: 0.4, lf: [0.9, -1.4], lb: [-0.3, -0.9], af: [-0.8, 2.0], ab: [-1.0, 1.8], headTilt: -0.25 }), 26],
  dashGo: [P({ lean: 0.95, af: [1.5, 0], asF: 1.9, ab: [-1.3, -0.2], lf: [-0.5, -0.4], lb: [-1.1, -0.2], headTilt: -0.6, headX: 4 }), 50],
  slamUp: [P({ lean: -0.1, af: [2.9, 0.2], ab: [2.7, 0.2], asF: 1.3, asB: 1.3, lf: [1.0, -1.5], lb: [0.4, -1.2], headTilt: -0.15 }), 26],
  slamDown: [P({ lean: 0.55, af: [0.8, 0.2], ab: [0.6, 0.2], asF: 1.5, asB: 1.5, lf: [1.0, -1.8], lb: [-0.2, -1.2], headTilt: -0.3, sx: 1.12, sy: 0.9 }), 60],
  flurryA: [P({ lean: 0.28, af: [1.5, 0.05], asF: 2.3, ab: [-0.6, 2.1], lf: [0.5, -0.5], lb: [-0.6, 0.1], headTilt: -0.1 }), 70],
  flurryB: [P({ lean: 0.2, ab: [1.45, 0.05], asB: 2.4, af: [-0.6, 2.2], lf: [0.5, -0.5], lb: [-0.6, 0.1], headTilt: -0.05 }), 70],
  uppercut: [P({ lean: -0.2, dy: -8, af: [2.75, 0.15], asF: 2.2, ab: [-0.7, 1.0], lf: [0.2, -0.1], lb: [-0.3, 0.2], headTilt: -0.2, sy: 1.1, sx: 0.94 }), 60],
};

/** Devuelve [poseObjetivo, rate] para el estado actual del luchador. */
export function targetPose(f) {
  const name = f.animName();
  const t = f.animT;
  switch (name) {
    case 'idle': {
      const b = Math.sin(t * 5);
      return [P({ dy: b * 1.2, headY: Math.sin(t * 5 + 1) * 0.9, af: [0.55 + b * 0.05, 1.55], ab: [0.15 - b * 0.05, 1.75] }), 16];
    }
    case 'intro': {
      // saltitos de calentamiento
      const b = Math.abs(Math.sin(t * 7));
      return [P({ dy: -b * 9, af: [0.7, 1.7 + b * 0.3], ab: [0.3, 1.9 - b * 0.3], lf: [0.25, -0.3 - b * 0.3], lb: [-0.3, -0.1 - b * 0.3] }), 20];
    }
    case 'walk': {
      const s = Math.sin(f.walkPhase);
      const c = Math.cos(f.walkPhase);
      const fwd = Math.sign(f.vx) === f.facing ? 1 : -1;
      return [
        P({
          dy: -Math.abs(c) * 2.5,
          lean: fwd > 0 ? 0.16 : -0.05,
          headY: Math.abs(s) * 1.2,
          lf: [s * 0.8, -0.3 - Math.max(0, c) * 0.7],
          lb: [-s * 0.8, -0.3 - Math.max(0, -c) * 0.7],
          af: [0.55 - s * 0.2, 1.55],
          ab: [0.15 + s * 0.2, 1.75],
        }),
        22,
      ];
    }
    case 'win': {
      const b = Math.abs(Math.sin(t * 6.5));
      const w = Math.sin(t * 13) * 0.2;
      return [
        P({ dy: -b * 22, lean: 0, headTilt: Math.sin(t * 6.5) * 0.12, af: [2.05 + w, 0.15], ab: [-2.05 + w, -0.15], asF: 2.6, asB: 2.6, lf: [0.3, -0.2 - b * 0.9], lb: [-0.3, -0.1 - b * 0.9], sy: 1 + b * 0.05 }),
        22,
      ];
    }
    default:
      return STATIC[name] || [BASE, 16];
  }
}
