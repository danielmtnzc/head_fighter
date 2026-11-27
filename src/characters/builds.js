// Complexiones (body.build). Solo cambian el dibujo; no afectan al combate.
// chest / waist: anchura arriba y abajo del torso; belly: barriga que sobresale (unidades);
// arm / leg: grosor de brazos y piernas; shoulder / hip: separación extra de hombros y caderas.
export const BUILDS = {
  delgado: { chest: 0.78, waist: 0.68, belly: 0, arm: 0.66, leg: 0.68, shoulder: -2, hip: -1.5 },
  normal: { chest: 1, waist: 1, belly: 0, arm: 1, leg: 1, shoulder: 0, hip: 0 },
  medioFuerte: { chest: 1.25, waist: 1, belly: 0, arm: 1.3, leg: 1.12, shoulder: 4, hip: 0.5 },
  fuerte: { chest: 1.55, waist: 1.04, belly: 0, arm: 1.65, leg: 1.25, shoulder: 9, hip: 1.5 },
  medioRelleno: { chest: 1.14, waist: 1.28, belly: 5, arm: 1.15, leg: 1.18, shoulder: 2, hip: 2 },
  pocoGordo: { chest: 1.26, waist: 1.52, belly: 9, arm: 1.28, leg: 1.34, shoulder: 5, hip: 4 },
  gordo: { chest: 1.37, waist: 1.74, belly: 12, arm: 1.39, leg: 1.47, shoulder: 7, hip: 6 },
  muyGordo: { chest: 1.48, waist: 1.95, belly: 15, arm: 1.5, leg: 1.6, shoulder: 9, hip: 8 },
};

export const buildOf = (body) => BUILDS[body.build] || BUILDS.normal;
