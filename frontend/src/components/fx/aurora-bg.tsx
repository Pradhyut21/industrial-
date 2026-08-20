/** CSS-driven aurora gradient background — silky animated mesh. */
export function AuroraBg() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="aurora-layer aurora-a" />
      <div className="aurora-layer aurora-b" />
      <div className="aurora-layer aurora-c" />
      <div className="aurora-grain" />
    </div>
  );
}
