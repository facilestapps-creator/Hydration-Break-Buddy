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

export const YOUTUBE_LINKS = [
  "https://www.youtube.com/watch?v=EsUHNnLEAU8", // 20-20-20
  "https://www.youtube.com/watch?v=nJCBpilGHh0", // Eye yoga
  "https://www.youtube.com/watch?v=mC4UQf8NHE0", // Eye relaxation
];