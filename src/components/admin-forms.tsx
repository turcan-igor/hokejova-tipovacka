"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCcw, Save } from "lucide-react";
import { TEAM_OPTIONS } from "@/lib/constants";
import type { FinalMedalsRow, MatchRow } from "@/lib/db-types";
import type { MatchStatus } from "@/lib/types";

export function AdminSyncButton() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function runSync() {
    setBusy(true);
    setMessage(null);
    const response = await fetch("/api/sync", { method: "POST" });
    const payload = await response.json();
    setBusy(false);
    setMessage(
      response.ok
        ? `Synchronizováno: ${payload.matchesSeen} zápasů`
        : `Sync se nepovedl: ${payload.detail ?? payload.error ?? "neznámá chyba"}`
    );
    if (response.ok) router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={runSync}
        disabled={busy}
        className="inline-flex h-11 items-center gap-2 rounded-md bg-rink-blue px-4 font-semibold text-white disabled:opacity-60"
      >
        <RefreshCcw size={17} />
        Spustit sync
      </button>
      {message ? <p className="mt-2 text-sm text-slate-600">{message}</p> : null}
    </div>
  );
}

export function FinalMedalsAdmin({ defaults }: { defaults?: FinalMedalsRow | null }) {
  const [gold, setGold] = useState(defaults?.gold_team_code ?? "CZE");
  const [silver, setSilver] = useState(defaults?.silver_team_code ?? "CAN");
  const [bronze, setBronze] = useState(defaults?.bronze_team_code ?? "SWE");
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    const response = await fetch("/api/admin/final-medals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ gold, silver, bronze })
    });
    setMessage(response.ok ? "Medaile uloženy a body přepočítány." : "Uložení se nepovedlo.");
  }

  return (
    <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
      {[
        ["Zlato", gold, setGold],
        ["Stříbro", silver, setSilver],
        ["Bronz", bronze, setBronze]
      ].map(([label, value, setter]) => (
        <label key={String(label)} className="text-sm font-semibold text-ice-900">
          {String(label)}
          <select
            value={String(value)}
            onChange={(event) => (setter as (value: string) => void)(event.target.value)}
            className="mt-2 h-11 w-full rounded-md border border-ice-100 bg-white px-3"
          >
            {TEAM_OPTIONS.map((team) => (
              <option key={team.code} value={team.code}>
                {team.name}
              </option>
            ))}
          </select>
        </label>
      ))}
      <button
        type="button"
        onClick={save}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-rink-red px-4 font-semibold text-white"
      >
        <Save size={17} />
        Uložit
      </button>
      {message ? <p className="md:col-span-4 text-sm text-slate-600">{message}</p> : null}
    </div>
  );
}

export function MatchOverrideAdmin({ matches }: { matches: MatchRow[] }) {
  const [matchId, setMatchId] = useState(matches[0]?.id ?? "");
  const selected = matches.find((match) => match.id === matchId);
  const [homeTeamCode, setHomeTeamCode] = useState(selected?.home_team_code ?? "");
  const [awayTeamCode, setAwayTeamCode] = useState(selected?.away_team_code ?? "");
  const [homeScore, setHomeScore] = useState(selected?.home_score ?? "");
  const [awayScore, setAwayScore] = useState(selected?.away_score ?? "");
  const [status, setStatus] = useState<MatchStatus>(selected?.status ?? "scheduled");
  const [message, setMessage] = useState<string | null>(null);

  function changeMatch(id: string) {
    setMatchId(id);
    const next = matches.find((match) => match.id === id);
    setHomeTeamCode(next?.home_team_code ?? "");
    setAwayTeamCode(next?.away_team_code ?? "");
    setHomeScore(next?.home_score ?? "");
    setAwayScore(next?.away_score ?? "");
    setStatus(next?.status ?? "scheduled");
  }

  async function save() {
    const response = await fetch("/api/admin/match-override", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        matchId,
        homeTeamCode: homeTeamCode || null,
        awayTeamCode: awayTeamCode || null,
        homeScore: homeScore === "" ? null : Number(homeScore),
        awayScore: awayScore === "" ? null : Number(awayScore),
        status
      })
    });
    setMessage(response.ok ? "Zápas uložen a body přepočítány." : "Uložení se nepovedlo.");
  }

  return (
    <div className="grid gap-4">
      <label className="text-sm font-semibold text-ice-900">
        Zápas
        <select
          value={matchId}
          onChange={(event) => changeMatch(event.target.value)}
          className="mt-2 h-11 w-full rounded-md border border-ice-100 bg-white px-3"
        >
          {matches.map((match) => (
            <option key={match.id} value={match.id}>
              {new Intl.DateTimeFormat("cs-CZ", { dateStyle: "short", timeStyle: "short" }).format(new Date(match.starts_at))} | {match.home_team_code ?? "?"} - {match.away_team_code ?? "?"}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-3 md:grid-cols-5 md:items-end">
        <TeamSelect label="Domácí" value={homeTeamCode} onChange={setHomeTeamCode} />
        <TeamSelect label="Hosté" value={awayTeamCode} onChange={setAwayTeamCode} />
        <label className="text-sm font-semibold text-ice-900">
          Skóre domácí
          <input
            type="number"
            min="0"
            value={homeScore}
            onChange={(event) => setHomeScore(event.target.value)}
            className="mt-2 h-11 w-full rounded-md border border-ice-100 px-3"
          />
        </label>
        <label className="text-sm font-semibold text-ice-900">
          Skóre hosté
          <input
            type="number"
            min="0"
            value={awayScore}
            onChange={(event) => setAwayScore(event.target.value)}
            className="mt-2 h-11 w-full rounded-md border border-ice-100 px-3"
          />
        </label>
        <label className="text-sm font-semibold text-ice-900">
          Stav
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as MatchStatus)}
            className="mt-2 h-11 w-full rounded-md border border-ice-100 bg-white px-3"
          >
            <option value="scheduled">scheduled</option>
            <option value="live">live</option>
            <option value="final">final</option>
            <option value="postponed">postponed</option>
            <option value="cancelled">cancelled</option>
          </select>
        </label>
      </div>

      <button
        type="button"
        onClick={save}
        className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-md bg-rink-red px-4 font-semibold text-white"
      >
        <Save size={17} />
        Uložit override
      </button>
      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
    </div>
  );
}

function TeamSelect({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-sm font-semibold text-ice-900">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-md border border-ice-100 bg-white px-3"
      >
        <option value="">Neznámý</option>
        {TEAM_OPTIONS.map((team) => (
          <option key={team.code} value={team.code}>
            {team.name}
          </option>
        ))}
      </select>
    </label>
  );
}
