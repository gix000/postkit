/* eslint-disable @next/next/no-img-element */

/**
 * George's P mark, built from two layers so the light stays on the shape:
 * the sparkle twinkles with a tight lime glow, and a thin specular sweep
 * crosses the P every few seconds (masked to the letterform, no halo).
 */
export default function Logo({ size = 28, glow = true }: { size?: number; glow?: boolean }) {
  const width = Math.round(size * (697 / 572));
  return (
    <span className={`logo${glow ? " is-live" : ""}`} style={{ width, height: size }} aria-hidden="true">
      <img src="/logo-p.png" alt="" width={width} height={size} className="logo-p" />
      {glow && <span className="logo-sheen" />}
      <img src="/logo-star.png" alt="" width={width} height={size} className="logo-star" />
    </span>
  );
}
