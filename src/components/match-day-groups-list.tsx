"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { LiveTipStateBadge } from "@/components/live-tip-state";
import { MatchTipForm } from "@/components/match-tip-form";
import { Matchup } from "@/components/team-badge";
import { getLivePredictionState } from "@/lib/scoring";
import type { MatchStatus } from "@/lib/types";

type MatchDayPredictionView = {
  homeScore: number;
  awayScore: number;
  points: number | null;
};

type MatchDayMatchView = {
  id: string;
  phase: string;
  venue: string | null;
  homeTeamCode: string | null;
  awayTeamCode: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  timeLabel: string;
  resultLabel: string;
  locked: boolean;
  prediction: MatchDayPredictionView | null;
};

export type MatchDayGroupView = {
  key: string;
  label: string;
  matches: MatchDayMatchView[];
};

export function MatchDayGroupsList({ groups }: { groups: MatchDayGroupView[] }) {
  const allGroupKeys = useMemo(() => groups.map((group) => group.key), [groups]);
  const [expandedKeys, setExpandedKeys] = useState<Set<string> | null>(null);

  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    setExpandedKeys(new Set(isMobile ? [] : allGroupKeys));
  }, [allGroupKeys]);

  if (groups.length === 0) {
    return null;
  }

  const expanded = expandedKeys ?? new Set<string>();

  function toggleGroup(groupKey: string) {
    setExpandedKeys((current) => {
      const next = new Set(current ?? []);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setExpandedKeys(new Set(allGroupKeys))}
          className="h-11 rounded-md bg-white px-3 text-sm font-semibold text-ice-900 shadow-soft hover:bg-ice-50 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          Rozbalit vše
        </button>
        <button
          type="button"
          onClick={() => setExpandedKeys(new Set())}
          className="h-11 rounded-md bg-white px-3 text-sm font-semibold text-ice-900 shadow-soft hover:bg-ice-50 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          Sbalit vše
        </button>
      </div>

      {groups.map((group) => {
        const isExpanded = expanded.has(group.key);
        const Icon = isExpanded ? ChevronUp : ChevronDown;

        return (
          <section
            key={group.key}
            className="rounded-lg border border-ice-100 bg-white shadow-soft dark:border-slate-700 dark:bg-slate-900"
          >
            <button
              type="button"
              onClick={() => toggleGroup(group.key)}
              aria-expanded={isExpanded}
              className="flex min-h-16 w-full items-center justify-between gap-3 rounded-lg p-5 text-left hover:bg-ice-50 dark:hover:bg-slate-800"
            >
              <div>
                <h2 className="text-xl font-bold capitalize text-ice-900 dark:text-slate-100">{group.label}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {group.matches.length} {group.matches.length === 1 ? "zápas" : "zápasů"}
                </p>
              </div>
              <Icon className="shrink-0 text-slate-500 dark:text-slate-300" size={22} aria-hidden="true" />
            </button>

            {isExpanded ? (
              <div className="grid gap-3 border-t border-ice-100 p-5 dark:border-slate-700">
                {group.matches.map((match) => (
                  <MatchDayRow key={match.id} match={match} />
                ))}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function MatchDayRow({ match }: { match: MatchDayMatchView }) {
  const teamsKnown = match.homeTeamCode && match.awayTeamCode;
  const liveState = match.prediction
    ? getLivePredictionState(
        { home_score: match.prediction.homeScore, away_score: match.prediction.awayScore },
        { home_score: match.homeScore, away_score: match.awayScore, status: match.status }
      )
    : null;

  return (
    <article className="grid gap-4 rounded-md border border-ice-100 p-4 dark:border-slate-700 md:grid-cols-[88px_1fr_120px_minmax(240px,auto)_96px] md:items-center">
      <div>
        <p className="text-lg font-bold text-ice-900 dark:text-slate-100">{match.timeLabel}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{match.venue ?? ""}</p>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase text-rink-blue dark:text-sky-300">{match.phase}</p>
        <Matchup homeTeamCode={match.homeTeamCode} awayTeamCode={match.awayTeamCode} />
      </div>

      <div>
        <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Výsledek</p>
        <p className="font-semibold text-ice-900 dark:text-slate-100">{match.resultLabel}</p>
      </div>

      <div>
        {teamsKnown ? (
          <MatchTipForm
            matchId={match.id}
            defaultHome={match.prediction?.homeScore}
            defaultAway={match.prediction?.awayScore}
            disabled={match.locked}
          />
        ) : (
          <span className="text-sm text-slate-500 dark:text-slate-400">Bude otevřeno po doplnění týmů</span>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Body</p>
        <p className="text-lg font-bold text-rink-blue dark:text-sky-300">{match.prediction?.points ?? "-"}</p>
        <div className="mt-2">
          <LiveTipStateBadge state={liveState} />
        </div>
      </div>
    </article>
  );
}
