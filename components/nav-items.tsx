import {
  Home,
  Camera,
  Refrigerator,
  Clock,
  Heart,
  CalendarDays,
  Apple,
  ShoppingCart,
  Users,
  Sparkles,
  CreditCard,
  Settings,
  ChefHat,
  type LucideIcon,
} from "lucide-react";

// Single source of truth for the in-app navigation, shared by the desktop
// sidebar, the mobile bottom bar and the mobile "More" drawer.
export type NavKey =
  | "home"
  | "scan"
  | "fridge"
  | "favorites"
  | "mealplan"
  | "nutrition"
  | "history"
  | "shopping"
  | "family"
  | "community"
  | "kitchen"
  | "plans"
  | "settings";

export const NAV_ITEMS: { href: string; key: NavKey; Icon: LucideIcon }[] = [
  { href: "/home", key: "home", Icon: Home },
  { href: "/scan", key: "scan", Icon: Camera },
  { href: "/fridge", key: "fridge", Icon: Refrigerator },
  { href: "/favorites", key: "favorites", Icon: Heart },
  { href: "/plan", key: "mealplan", Icon: CalendarDays },
  { href: "/nutrition", key: "nutrition", Icon: Apple },
  { href: "/history", key: "history", Icon: Clock },
  { href: "/shopping", key: "shopping", Icon: ShoppingCart },
  { href: "/family", key: "family", Icon: Users },
  { href: "/community", key: "community", Icon: Sparkles },
  { href: "/kitchen", key: "kitchen", Icon: ChefHat },
  { href: "/upgrade", key: "plans", Icon: CreditCard },
  { href: "/settings", key: "settings", Icon: Settings },
];

// Keys shown directly in the mobile bottom bar (the rest live in the drawer).
export const QUICK_KEYS: NavKey[] = ["home", "scan", "fridge", "history"];
