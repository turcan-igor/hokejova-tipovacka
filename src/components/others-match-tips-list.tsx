"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { LiveTipStateBadge, liveTipCardClass } from "@/components/live-tip-state";
import { Matchup } from "@/components/team-badge";
import { getLivePredictionState } from "@/lib/scoring";
import type { MatchStatus } from "@/lib/types";

type OthersMatchTipPrediction = {
  id: string;
  userName: string;
  homeScore: number;
  awayScore: number;
  points: number | null;
  isExact: boolean;
};

export type OthersMatchTipMatch = {
  id: string;
  homeTeamCode: string | null;
  awayTeamCode: string | null;
  startsAtLabel: string;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  resultLabel: string;
  predictions: OthersMatchTipPrediction[];
};

const exactTipClass =
  "rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100";
const winnerTipClass =
  "rounded-md border border-orange-300 bg-orange-50 px-3 py-2 text-sm text-orange-950 dark:border-orange-700 dark:bg-orange-950/40 dark:text-orange-100";
const neutralTipClass =
  "rounded-md bg-ice-100 px-3 py-2 text-sm text-ice-900 dark:bg-slate-800 dark:text-slate-100";

export function OthersMatchTipsList({ matches }: { matches: OthersMatchTipMatch[] }) {
  const allMatchIds = useMemo(() => matches.map((match) => match.id), [matches]);
  const [expandedIds, setExpandedIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    setExpandedIds(new Set(isMobile ? [] : allMatchIds));
  }, [allMatchIds]);

  if (matches.length === 0) {
    return (
      <p className="rounded-md bg-ice-100 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300">
        Zatím není uzamčený žádný zápas.
      </p>
    );
  }

  const expanded = expandedIds ?? new Set<string>();

  function toggleMatch(matchId: string) {
    setExpandedIds((current) => {
      const next = new Set(current ?? []);
      if (next.has(matchId)) {
        next.delete(matchId);
      } else {
        next.add(matchId);
      }
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setExpandedIds(new Set(allMatchIds))}
          className="h-11 rounded-md bg-ice-100 px-3 text-sm font-semibold text-ice-900 hover:bg-ice-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          Rozbalit vše
        </button>
        <button
          type="button"
          onClick={() => setExpandedIds(new Set())}
          className="h-11 rounded-md bg-ice-100 px-3 text-sm font-semibold text-ice-900 hover:bg-ice-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          Sbalit vše
        </button>
      </div>

      {matches.map((match) => {
        const isExpanded = expanded.has(match.id);
        const Icon = isExpanded ? ChevronUp : ChevronDown;

        return (
          <article key={match.id} className="rounded-md border border-ice-100 dark:border-slate-700">
            <button
              type="button"
              onClick={() => toggleMatch(match.id)}
              aria-expanded={isExpanded}
              className="flex min-h-16 w-full flex-col gap-3 rounded-md p-4 text-left hover:bg-ice-50 dark:hover:bg-slate-800 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <Matchup homeTeamCode={match.homeTeamCode} awayTeamCode={match.awayTeamCode} />
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{match.startsAtLabel}</p>
              </div>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{match.resultLabel}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {match.predictions.length} {match.predictions.length === 1 ? "tip" : "tipů"}
                  </p>
                </div>
                <Icon className="shrink-0 text-slate-500 dark:text-slate-300" size={20} aria-hidden="true" />
              </div>
            </button>

            {isExpanded ? (
              <div className="border-t border-ice-100 p-4 dark:border-slate-700">
                {match.predictions.length > 0 ? (
                  <div className="grid gap-2 md:grid-cols-3">
                    {match.predictions.map((prediction) => (
                      <PredictionCard key={prediction.id} prediction={prediction} match={match} />
                    ))}
                  </div>
                ) : (
                  <p className="rounded-md bg-ice-100 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    K tomuto zápasu zatím nejsou viditelné žádné tipy.
                  </p>
                )}
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function PredictionCard({
  prediction,
  match
}: {
  prediction: OthersMatchTipPrediction;
  match: OthersMatchTipMatch;
}) {
  const liveState = getLivePredictionState(
    { home_score: prediction.homeScore, away_score: prediction.awayScore },
    {
      home_score: match.homeScore,
      away_score: match.awayScore,
      status: match.status
    }
  );
  const isExact = match.status === "final" && (prediction.isExact || prediction.points === 3);
  const isWinner = match.status === "final" && !isExact && prediction.points === 1;
  const className =
    match.status === "live"
      ? liveTipCardClass(liveState)
      : isExact
        ? exactTipClass
        : isWinner
          ? winnerTipClass
          : neutralTipClass;

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2">
        <strong>{prediction.userName}</strong>
        {match.status === "live" ? <LiveTipStateBadge state={liveState} /> : null}
        {isExact ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100">
            Přesně
          </span>
        ) : null}
        {isWinner ? (
          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-800 dark:bg-orange-900 dark:text-orange-100">
            Správný vítěz
          </span>
        ) : null}
      </div>
      <p className="mt-1 font-semibold">
        {prediction.homeScore}:{prediction.awayScore}
      </p>
    </div>
  );
}
