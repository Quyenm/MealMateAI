import type { ReactNode } from "react";
import { UtensilsCrossed } from "lucide-react";

/**
 * A dish header image. Shows the real photo when we have one (Wikipedia), and a
 * branded gradient placeholder otherwise — never an unrelated stock photo, so
 * the picture always matches the dish (or is honestly absent).
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
  return (
    <div className={`relative w-full overflow-hidden bg-muted ${className}`}>
      {image?.url ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.url} alt="" className="h-full w-full object-cover" />
          {credit && (
            <a
              href={image.credit_url}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-1.5 right-1.5 rounded bg-black/45 px-1.5 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-sm"
            >
              Wikipedia
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
