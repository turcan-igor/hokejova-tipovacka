import type { TipperAward } from "@/lib/tipper-stats";

export type TipperTrophyColor =
  | "emerald"
  | "sky"
  | "amber"
  | "green"
  | "blue"
  | "cyan"
  | "rose"
  | "violet"
  | "orange"
  | "yellow"
  | "slate"
  | "fuchsia"
  | "gold";

export type TipperTrophyIcon =
  | "Crosshair"
  | "Eye"
  | "BadgePlus"
  | "ClipboardCheck"
  | "TrendingUp"
  | "CalendarDays"
  | "ArrowDownWideNarrow"
  | "Gauge"
  | "Flame"
  | "Zap"
  | "Shield"
  | "Shuffle"
  | "Trophy";

export type TipperTrophy = {
  key: string;
  title: string;
  description: string;
  group: TipperAward["group"];
  value: string;
  icon: TipperTrophyIcon;
  color: TipperTrophyColor;
};

export const TIPPER_TROPHY_CONFIG: Record<string, { icon: TipperTrophyIcon; color: TipperTrophyColor }> = {
  "exact-king": { icon: "Crosshair", color: "emerald" },
  "winner-oracle": { icon: "Eye", color: "sky" },
  "one-point": { icon: "BadgePlus", color: "amber" },
  discipline: { icon: "ClipboardCheck", color: "green" },
  form5: { icon: "TrendingUp", color: "blue" },
  "best-day": { icon: "CalendarDays", color: "cyan" },
  behind: { icon: "ArrowDownWideNarrow", color: "rose" },
  average: { icon: "Gauge", color: "violet" },
  drama: { icon: "Flame", color: "orange" },
  shootout: { icon: "Zap", color: "yellow" },
  concrete: { icon: "Shield", color: "slate" },
  contrarian: { icon: "Shuffle", color: "fuchsia" }
};

export const FALLBACK_TROPHY_CONFIG = { icon: "Trophy", color: "gold" } as const;

export function createTrophyFromAward(award: TipperAward): TipperTrophy {
  const config = TIPPER_TROPHY_CONFIG[award.key] ?? FALLBACK_TROPHY_CONFIG;
  return {
    key: award.key,
    title: award.title,
    description: award.description,
    group: award.group,
    value: award.value,
    icon: config.icon,
    color: config.color
  };
}
