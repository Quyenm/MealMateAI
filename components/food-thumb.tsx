import { FoodGlyph, type GlyphName } from "@/components/landing/food-glyphs";

// Appetite gradients reused from the landing dish cards — the brand's "color"
// comes from food, not from UI chrome.
const GRADS = [
  "from-[#fff1df] via-[#ffe2c2] to-[#ffce9e]",
  "from-[#e7f4dd] via-[#d6ecc4] to-[#c2e3a6]",
  "from-[#fde6e0] via-[#fbd3c8] to-[#f6bda9]",
] as const;

/** A dish thumbnail: appetite gradient + a single-stroke food glyph. */
export function FoodThumb({
  glyph = "bowl",
  variant = 0,
  className = "size-12",
  glyphClassName = "size-6",
}: {
  glyph?: GlyphName;
  variant?: number;
  className?: string;
  glyphClassName?: string;
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ring-1 ring-white/50 ${GRADS[variant % 3]} ${className}`}
    >
      <FoodGlyph name={glyph} className={`${glyphClassName} text-[#b85a2e]/75`} />
    </span>
  );
}
