import {
  ArrowDownWideNarrow,
  BadgePlus,
  CalendarDays,
  ClipboardCheck,
  Crosshair,
  Eye,
  Flame,
  Gauge,
  Shield,
  Shuffle,
  TrendingUp,
  Trophy,
  Zap
} from "lucide-react";
import type { TipperTrophy, TipperTrophyColor, TipperTrophyIcon } from "@/lib/tipper-trophy-config";

const iconMap: Record<TipperTrophyIcon, typeof Trophy> = {
  ArrowDownWideNarrow,
  BadgePlus,
  CalendarDays,
  ClipboardCheck,
  Crosshair,
  Eye,
  Flame,
  Gauge,
  Shield,
  Shuffle,
  TrendingUp,
  Trophy,
  Zap
};

const colorClassMap: Record<TipperTrophyColor, string> = {
  amber: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200",
  blue: "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-blue-950/50 dark:text-blue-200",
  cyan: "border-cyan-300 bg-cyan-50 text-cyan-800 dark:border-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-200",
  emerald: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200",
  fuchsia: "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-800 dark:border-fuchsia-700 dark:bg-fuchsia-950/50 dark:text-fuchsia-200",
  gold: "border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-200",
  green: "border-green-300 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-950/50 dark:text-green-200",
  orange: "border-orange-300 bg-orange-50 text-orange-800 dark:border-orange-700 dark:bg-orange-950/50 dark:text-orange-200",
  rose: "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-700 dark:bg-rose-950/50 dark:text-rose-200",
  sky: "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-700 dark:bg-sky-950/50 dark:text-sky-200",
  slate: "border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200",
  violet: "border-violet-300 bg-violet-50 text-violet-800 dark:border-violet-700 dark:bg-violet-950/50 dark:text-violet-200",
  yellow: "border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-200"
};

export function TipperTrophyBadge({
  trophy,
  size = "sm"
}: {
  trophy: TipperTrophy;
  size?: "sm" | "lg";
}) {
  const Icon = iconMap[trophy.icon] ?? Trophy;
  const title = `${trophy.title}: ${trophy.description}`;
  const sizeClasses = size === "lg" ? "h-12 w-12 rounded-xl" : "h-8 w-8 rounded-full";
  const iconSize = size === "lg" ? 24 : 16;

  return (
    <span
      title={title}
      aria-label={title}
      className={`inline-flex shrink-0 items-center justify-center border ${sizeClasses} ${colorClassMap[trophy.color]}`}
    >
      <Icon size={iconSize} aria-hidden="true" />
    </span>
  );
}

export function TipperTrophyList({
  trophies,
  emptyLabel = "-"
}: {
  trophies: TipperTrophy[];
  emptyLabel?: string;
}) {
  if (trophies.length === 0) {
    return <span className="text-sm text-slate-500 dark:text-slate-400">{emptyLabel}</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {trophies.map((trophy) => (
        <TipperTrophyBadge key={trophy.key} trophy={trophy} />
      ))}
    </div>
  );
}
