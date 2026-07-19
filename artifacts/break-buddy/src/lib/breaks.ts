export type BreakType = "hydration" | "walk" | "eye";

export interface BreakInfo {
  id: BreakType;
  title: string;
  icon: string;
  description: string;
  color: string;
}

export const BREAK_TYPES: Record<BreakType, BreakInfo> = {
  hydration: {
    id: "hydration",
    title: "Hydration Break",
    icon: "💧",
    description: "Time to drink some water! Stand up, grab your bottle, and take a few refreshing sips.",
    color: "bg-accent",
  },
  walk: {
    id: "walk",
    title: "Walk & Stretch",
    icon: "🚶",
    description: "Step away from your screen for a couple of minutes. Walk around, stretch your legs, get some blood flowing.",
    color: "bg-primary",
  },
  eye: {
    id: "eye",
    title: "Eye Rest",
    icon: "👀",
    description: "Give your eyes a rest with a quick exercise to prevent strain.",
    color: "bg-secondary",
  }
};

// Duration in seconds for the in-modal countdown, by break type
export const BREAK_DURATIONS: Record<BreakType, number> = {
  hydration: 120,  // 2 minutes
  eye: 180,        // 3 minutes
  walk: 300,       // 5 minutes
};

// Google Search links — never go stale unlike direct video links.
// hydration has no video button.
export const BREAK_SEARCH_URLS: Partial<Record<BreakType, string>> = {
  eye: `https://www.google.com/search?q=${encodeURIComponent("videos para descanso visual")}`,
  walk: `https://www.google.com/search?q=${encodeURIComponent("videos para descanso de oficina en 5 minutos")}`,
};
