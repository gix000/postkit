import Image from "next/image";

/** George's P mark with the sparkle. The halo behind it crossfades lime → hot pink. */
export default function Logo({ size = 28, glow = true }: { size?: number; glow?: boolean }) {
  return (
    <span className={`logo-wrap${glow ? " glow" : ""}`}>
      <Image src="/logo.png" alt="" width={Math.round(size * (697 / 572))} height={size} priority unoptimized />
    </span>
  );
}
