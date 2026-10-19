import Image from "next/image";

/** George's P mark with the sparkle, glowing lime → hot pink. */
export default function Logo({ size = 28, glow = true }: { size?: number; glow?: boolean }) {
  return (
    <Image
      src="/logo.png"
      alt=""
      width={Math.round(size * (700 / 573))}
      height={size}
      priority
      unoptimized
      className={glow ? "logo-glow" : undefined}
    />
  );
}
