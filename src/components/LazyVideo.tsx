"use client";
import { useEffect, useRef } from "react";

/**
 * A muted looping clip that downloads and plays only while it's on screen,
 * so pages with many previews stay light and scroll smoothly.
 */
export default function LazyVideo({ src, poster, className = "", sized = false }: { src: string; poster?: string; className?: string; /** Load the size up front (for grids whose layout depends on it). */ sized?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          if (!v.getAttribute("src")) v.src = src;
          v.play().catch(() => {});
        } else {
          v.pause();
        }
      },
      { rootMargin: "200px 0px", threshold: 0.15 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [src]);
  return <video ref={ref} src={sized ? src : undefined} poster={poster} muted loop playsInline preload={sized ? "metadata" : "none"} className={className} />;
}
