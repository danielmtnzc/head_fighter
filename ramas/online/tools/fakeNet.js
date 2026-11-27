// Red de mentira entre dos extremos, con latencia, variación y pérdida de paquetes.
// El reloj lo mueve quien la usa (advance), así las pruebas en node son repetibles.

/**
 * @param opts { latency (ms de ida), jitter (± ms), loss (0..1), dup? (0..1), arrayBuffer?, random? }
 *             — se pueden cambiar en marcha
 * @returns { a, b, opts, advance(ms) }  a y b son transportes { send, onMessage }
 */
export function createFakeLink(opts) {
  const queue = [];
  let now = 0;
  const random = opts.random || Math.random;
  const end = () => ({ onMessage: null, other: null, send: null });
  const a = end();
  const b = end();
  for (const [me, other] of [[a, b], [b, a]]) {
    me.send = (data) => {
      if (random() < opts.loss) return;
      const copies = random() < (opts.dup || 0) ? 2 : 1;
      for (let i = 0; i < copies; i++) {
        const delay = Math.max(0, opts.latency + (random() * 2 - 1) * opts.jitter);
        const copy = data.slice();
        // un DataChannel de verdad entrega ArrayBuffer
        queue.push({ at: now + delay, to: other, data: opts.arrayBuffer ? copy.buffer : copy });
      }
    };
  }
  return {
    a,
    b,
    opts,
    advance(ms) {
      now += ms;
      // entrega por hora de llegada: con variación, los paquetes se desordenan
      queue.sort((p, q) => p.at - q.at);
      while (queue.length && queue[0].at <= now) {
        const p = queue.shift();
        p.to.onMessage?.(p.data);
      }
    },
  };
}
