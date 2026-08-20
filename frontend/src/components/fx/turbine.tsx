/** Pure CSS 3D turbine — decorative, idles, spins faster on hover. */
export function TurbineSpinner({ size = 80 }: { size?: number }) {
  return (
    <div
      className="turbine"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <div className="turbine-hub" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="turbine-blade"
          style={{ transform: `rotate(${i * 60}deg)` }}
        />
      ))}
    </div>
  );
}
