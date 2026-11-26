// Plantilla de luchadores. Para añadir un personaje: crea su archivo en defs/
// (copiando _plantilla.js), impórtalo aquí y añádelo a la lista.
import rayo from './defs/rayo.js';
import brasas from './defs/brasas.js';
import tanque from './defs/tanque.js';
import chispa from './defs/chispa.js';
import nani from './defs/nani.js';
import kalong from './defs/kalong.js';
import jd from './defs/jd.js';
import pipo from './defs/pipo.js';
import minimocho from './defs/minimocho.js';
import mogailes from './defs/mogailes.js';
import escu from './defs/escu.js';
import loison from './defs/loison.js';
import huesito from './defs/huesito.js';
import zelaking from './defs/zelaking.js';

export const ROSTER = [rayo, brasas, tanque, chispa, nani, kalong, jd, pipo, minimocho, mogailes, escu, loison, huesito, zelaking];

export const getCharacter = (id) => ROSTER.find((c) => c.id === id) || ROSTER[0];
