// Registro de tipos de ataque especial.
// Cada tipo es un "comportamiento" reutilizable que se parametriza desde la
// configuración del personaje (special.params y special.fx).
//
// Interfaz de un tipo:
//   start(f, sp, world, a)        se llama al empezar
//   update(f, sp, world, dt, a)   cada paso; devuelve true cuando termina
//   pose(f, a, sp)                nombre de la pose (ver characters/poses.js)
//   prop?(ctx, f, a, sp)          dibuja un objeto en la mano delantera (+x = hacia delante)
//   cancel?(f, a)                 si le golpean a mitad
// `a` es la acción en curso: a.t = tiempo, a.s = estado libre, a.keepVel = sin fricción.
//
// Para un comportamiento nuevo: crea un archivo aquí, expórtalo y regístralo abajo.
import projectile from './projectile.js';
import dash from './dash.js';
import explosion from './explosion.js';
import multihit from './multihit.js';
import shotgun from './shotgun.js';
import spray from './spray.js';
import gang from './gang.js';

export const SPECIALS = { projectile, dash, explosion, multihit, shotgun, spray, gang };
