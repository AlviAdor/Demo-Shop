import Image from "next/image";
import { PHOTOS, type PhotoKey } from "@/lib/photos";

type Common = { className?: string; sizes?: string; priority?: boolean };

// A real photograph, cropped to its container with a soft blur-up placeholder.
export function Photo({ k, pos = "50% 50%", className = "", sizes = "(min-width: 768px) 50vw, 100vw", priority = false }: { k: PhotoKey; pos?: string } & Common) {
  const p = PHOTOS[k];
  return (
    <Image src={p.src} alt={p.alt} fill sizes={sizes} priority={priority} quality={85} placeholder="blur" blurDataURL={p.blur} className={`object-cover ${className}`} style={{ objectPosition: pos }} />
  );
}
