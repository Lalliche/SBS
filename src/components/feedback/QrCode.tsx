/* Decorative QR-style pattern (deterministic from the seed string; not scannable). */
export function QrCode({ seed, className }: { seed: string; className?: string }) {
  const n = 21;
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const cells: Array<[number, number]> = [];
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const finder = (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
      h = (Math.imul(h, 1103515245) + 12345) >>> 0;
      if (!finder && (h >>> 16) % 100 < 47) cells.push([x, y]);
    }
  const f = (ox: number, oy: number) => (
    <g key={`${ox}${oy}`}>
      <rect x={ox} y={oy} width="7" height="7" fill="#050703" />
      <rect x={ox + 1} y={oy + 1} width="5" height="5" fill="#fff" />
      <rect x={ox + 2} y={oy + 2} width="3" height="3" fill="#050703" />
    </g>
  );
  return (
    <svg viewBox={`-1 -1 ${n + 2} ${n + 2}`} className={className} role="img" aria-label="QR code du lien client" shapeRendering="crispEdges">
      <rect x="-1" y="-1" width={n + 2} height={n + 2} fill="#fff" />
      {cells.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#050703" />)}
      {f(0, 0)}
      {f(n - 7, 0)}
      {f(0, n - 7)}
    </svg>
  );
}
