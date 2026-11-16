// Plantilla de luchadores. Para añadir un personaje: crea su archivo en defs/
// (copiando _plantilla.js), impórtalo aquí y añádelo a la lista.
import rayo from './defs/rayo.js';
import brasas from './defs/brasas.js';
import tanque from './defs/tanque.js';
import chispa from './defs/chispa.js';

export const ROSTER = [rayo, brasas, tanque, chispa];

export const getCharacter = (id) => ROSTER.find((c) => c.id === id) || ROSTER[0];
