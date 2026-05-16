import { Activity, CheckCircle2, CircleHelp, Target } from "lucide-react";
import type { LivePredictionState } from "@/lib/scoring";

const liveStateConfig: Record<LivePredictionState, { label: string; className: string; icon: typeof Target }> = {
  "exact-now": {
    label: "Přesně teď",
    className: "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100",
    icon: Target
  },
  "winner-now": {
    label: "Správný vítěz teď",
    className: "border-orange-300 bg-orange-50 text-orange-950 dark:border-orange-700 dark:bg-orange-950/40 dark:text-orange-100",
    icon: CheckCircle2
  },
  "can-still-hit": {
    label: "Ještě může vyjít",
    className: "border-sky-300 bg-sky-50 text-sky-950 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-100",
    icon: CircleHelp
  },
  out: {
    label: "Mimo přesný tip",
    className: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
    icon: Activity
  }
};

export function LiveTipStateBadge({ state }: { state: LivePredictionState | null }) {
  if (!state || state === "out") return null;

  const config = liveStateConfig[state];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold ${config.className}`}>
      <Icon size={13} />
      {config.label}
    </span>
  );
}

export function liveTipCardClass(state: LivePredictionState | null) {
  if (!state || state === "out") return "rounded-md bg-ice-100 px-3 py-2 text-sm text-ice-900 dark:bg-slate-800 dark:text-slate-100";
  return `rounded-md border px-3 py-2 text-sm ${liveStateConfig[state].className}`;
}
