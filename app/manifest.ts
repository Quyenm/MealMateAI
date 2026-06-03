import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MealMate AI",
    short_name: "MealMate",
    description: "Chụp tủ lạnh — AI gợi món nấu được ngay.",
    start_url: "/home",
    display: "standalone",
    background_color: "#fcfaf6",
    theme_color: "#2ba3d9",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
