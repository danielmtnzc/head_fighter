// Generador de azar con semilla (mulberry32) para todo lo que afecte a la partida.
// El estado es un entero: dos combates con la misma semilla sacan los mismos números.
export function createRng(seed) {
  return {
    state: seed >>> 0,
    /** Número en [0, 1). */
    next() {
      this.state = (this.state + 0x6d2b79f5) >>> 0;
      let t = this.state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    /** Número en [a, b). */
    range(a, b) {
      return a + this.next() * (b - a);
    },
  };
}

export const randomSeed = () => (Math.random() * 4294967296) >>> 0;
