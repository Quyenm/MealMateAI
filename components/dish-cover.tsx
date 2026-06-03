"use client";

import { useState, type ReactNode } from "react";
import { UtensilsCrossed, ExternalLink } from "lucide-react";

/**
 * A dish header image. Shows the real photo when we have one and it loads; on a
 * load error (e.g. a hotlinked source went away) or no image it falls back to a
 * branded gradient placeholder — never a broken-image icon or a wrong photo.
 */
export function DishCover({
  image,
  className = "aspect-[16/10]",
  credit = false,
  iconClassName = "size-8",
  children,
}: {
  image?: { url: string; credit_url?: string } | null;
  className?: string;
  credit?: boolean;
  iconClassName?: string;
  children?: ReactNode;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImg = !!image?.url && failedUrl !== image.url;

  return (
    <div className={`relative w-full overflow-hidden bg-muted ${className}`}>
      {showImg ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image!.url}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setFailedUrl(image!.url)}
          />
          {credit && image!.credit_url && (
            <a
              href={image!.credit_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="source"
              className="absolute bottom-1.5 right-1.5 rounded bg-black/45 p-1 text-white/90 backdrop-blur-sm"
            >
              <ExternalLink className="size-3" />
            </a>
          )}
        </>
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-warm-100 to-warm-200">
          <UtensilsCrossed className={`text-[#b85a2e]/40 ${iconClassName}`} />
        </div>
      )}
      {children}
    </div>
  );
}
