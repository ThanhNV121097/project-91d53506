/** A square QR drawn from the booking code — the code itself is the content. */
export default function QrCode({ code }: { code: string }) {
  const cells = 21;
  const squares = [];
  for (let y = 0; y < cells; y += 1) {
    for (let x = 0; x < cells; x += 1) {
      if (on(code, x, y, cells)) squares.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" />);
    }
  }
  return (
    <svg viewBox={`0 0 ${cells} ${cells}`} role="img" aria-label={`Booking code ${code}`} className="h-40 w-40 text-ink">
      {squares}
    </svg>
  );
}

function corner(x: number, y: number, cells: number): boolean {
  const near = 7;
  const far = cells - 8;
  return (x < near && y < near) || (x > far && y < near) || (x < near && y > far);
}

function on(code: string, x: number, y: number, cells: number): boolean {
  if (corner(x, y, cells)) return x % 6 === 0 || y % 6 === 0 || (x > 1 && x < 5 && y > 1 && y < 5);
  const n = code.charCodeAt((x * 7 + y * 3) % code.length) + x * 31 + y * 17;
  return n % 3 === 0;
}
