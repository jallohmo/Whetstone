"use client";

import { useState } from "react";

/**
 * The photo layer for <Avatar>. Rendered on top of the gradient monogram; if the
 * image is missing or fails to load, it removes itself and the monogram shows
 * through. Kept as a tiny client island so <Avatar> itself stays server-safe.
 */
export function AvatarImage({ src, alt }: { src: string; alt?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt ?? ""}
      onError={() => setFailed(true)}
      className="absolute inset-0 h-full w-full rounded-pill object-cover"
    />
  );
}
