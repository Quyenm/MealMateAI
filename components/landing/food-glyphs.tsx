import type { ReactNode, SVGProps } from "react";

/**
 * Single-stroke food line glyphs at strokeWidth 1.6 so they sit naturally
 * beside lucide-react icons. Used as 12px chip icons, ~64px dish illustrations,
 * and faint section watermarks. No emoji anywhere on the landing page.
 */
export type GlyphName =
  | "bowl"
  | "egg"
  | "leaf"
  | "tomato"
  | "chopsticks"
  | "sauce"
  | "pan"
  | "fish";

const PATHS: Record<GlyphName, ReactNode> = {
  // Steaming bowl (phở / canh)
  bowl: (
    <>
      <path d="M3.5 11h17a8.5 8.5 0 0 1-8.5 7 8.5 8.5 0 0 1-8.5-7Z" />
      <path d="M9 3.5c-.8 1 .8 2 0 3M13 3c-.8 1 .8 2 0 3" />
      <path d="M2 11h20" />
    </>
  ),
  // Fried egg
  egg: (
    <>
      <path d="M8.5 6.5C12 3.5 17 5 17.5 9.2c.4 3.4-1.8 6.3-5.4 6.3-3.9 0-7.6-2-7.6-5.3 0-2.4 2.4-3 4-3.7Z" />
      <circle cx="11.5" cy="10.5" r="2.3" />
    </>
  ),
  // Herb leaf
  leaf: (
    <>
      <path d="M11 20A7 7 0 0 1 4 13C4 7.5 10.5 4 20 4c.3 9-3 16-9 16Z" />
      <path d="M5 20C8 14.5 12 10 17.5 7.5" />
    </>
  ),
  // Tomato
  tomato: (
    <>
      <path d="M12 8.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Z" />
      <path d="M12 8.5V6M12 6c-1-1.2-2.4-1.2-3.5-.6M12 6c1-1.2 2.4-1.2 3.5-.6" />
    </>
  ),
  // Crossed chopsticks
  chopsticks: (
    <>
      <path d="M5 19 18.5 5.5M9.5 19 21 7.5" />
    </>
  ),
  // Fish-sauce bottle
  sauce: (
    <>
      <path d="M10 3.5h4v2.2l1.2 2.3V19a1.8 1.8 0 0 1-1.8 1.8h-2.8A1.8 1.8 0 0 1 8.8 19V8l1.2-2.3Z" />
      <path d="M9 13.5h6" />
    </>
  ),
  // Pan / wok
  pan: (
    <>
      <path d="M3.5 9.5h13a5.5 5.5 0 0 1-5.5 5.5h-2a5.5 5.5 0 0 1-5.5-5.5Z" />
      <path d="M16.5 9.5 22 7.2" />
      <path d="M8 6c.6-.7.6-1.6 0-2.3M11 6c.6-.7.6-1.6 0-2.3" />
    </>
  ),
  // Fish
  fish: (
    <>
      <path d="M3 12c3.5-4.5 10-4.5 14 0-4 4.5-10.5 4.5-14 0Z" />
      <path d="M17 12l4-3.2v6.4Z" />
      <circle cx="7.5" cy="11" r="0.6" fill="currentColor" stroke="none" />
    </>
  ),
};

export function FoodGlyph({
  name,
  ...props
}: { name: GlyphName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {PATHS[name]}
    </svg>
  );
}
