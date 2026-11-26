// Prueba de determinismo: node tools/sim.mjs
// Juega todos los cruces por duplicado y comprueba que ambas copias coinciden en cada tick.
import { PAIRS, runBattle, hex, names } from './harness.js';
import { mix, HASH_START } from '../src/net/checksum.js';
import { SPECIALS } from '../src/combat/specials/index.js';
import { ROSTER } from '../src/characters/roster.js';

let total = HASH_START;
const hashes = [];
let ticks = 0;
const seen = new Set();

for (let i = 0; i < PAIRS.length; i++) {
  const r = runBattle(i, { twin: true });
  if (r.diff !== null) {
    console.error(`FALLO en "${names(i)}" (cruce ${i}): las copias difieren en el tick ${r.diff}`);
    process.exit(1);
  }
  hashes[i] = r.hash;
  total = mix(total, r.hash);
  ticks += r.ticks;
  r.specials.forEach((s) => seen.add(s));
}

// repetidos al revés: un combate no puede depender de los jugados antes
for (let i = PAIRS.length - 1; i >= 0; i--) {
  if (runBattle(i).hash !== hashes[i]) {
    console.error(`FALLO en "${names(i)}" (cruce ${i}): cambia según los combates anteriores`);
    process.exit(1);
  }
}

const used = [...new Set(ROSTER.map((c) => c.special.type))];
const missing = used.filter((t) => !seen.has(t));
if (missing.length) {
  console.error(`FALLO: especiales sin probar: ${missing.join(', ')}`);
  process.exit(1);
}
const unused = Object.keys(SPECIALS).filter((t) => !used.includes(t));
if (unused.length) console.log(`Tipos de especial que no usa ningún personaje: ${unused.join(', ')}`);
console.log(`OK ${PAIRS.length} combates, ${ticks} ticks, ${seen.size} especiales distintos`);
console.log(`Hash global: ${hex(total)}`);
