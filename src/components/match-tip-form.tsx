"use client";

import { useState } from "react";
import { Save } from "lucide-react";

export function MatchTipForm({
  matchId,
  defaultHome,
  defaultAway,
  disabled
}: {
  matchId: string;
  defaultHome?: number | null;
  defaultAway?: number | null;
  disabled: boolean;
}) {
  const hasSavedPrediction = defaultHome !== null && defaultHome !== undefined && defaultAway !== null && defaultAway !== undefined;
  const [homeScore, setHomeScore] = useState(defaultHome ?? 0);
  const [awayScore, setAwayScore] = useState(defaultAway ?? 0);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (disabled && !hasSavedPrediction) {
    return <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Netipováno</span>;
  }

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/predictions/match", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ matchId, homeScore, awayScore })
      });
      const payload = await parseJson(response);
      setMessage(response.ok ? "Uloženo" : payload.error ?? "Nepovedlo se uložit tip.");
    } catch {
      setMessage("Nepovedlo se uložit tip. Zkuste to prosím znovu.");
    } finally {
      setBusy(false);
    }
  }

  const controlsDisabled = disabled || busy;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        aria-label="Domácí skóre"
        disabled={controlsDisabled}
        type="number"
        min="0"
        max="30"
        value={homeScore}
        onChange={(event) => setHomeScore(Number(event.target.value))}
        className="h-11 w-16 rounded-md border border-ice-100 px-2 text-center disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:disabled:bg-slate-800"
      />
      <span className="font-semibold dark:text-slate-100">:</span>
      <input
        aria-label="Hosté skóre"
        disabled={controlsDisabled}
        type="number"
        min="0"
        max="30"
        value={awayScore}
        onChange={(event) => setAwayScore(Number(event.target.value))}
        className="h-11 w-16 rounded-md border border-ice-100 px-2 text-center disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:disabled:bg-slate-800"
      />
      <button
        type="button"
        disabled={controlsDisabled}
        onClick={save}
        className="inline-flex h-11 items-center gap-2 rounded-md bg-rink-blue px-3 text-sm font-semibold text-white disabled:bg-slate-300 dark:disabled:bg-slate-700"
      >
        <Save size={16} />
        {busy ? "Ukládám..." : "Uložit"}
      </button>
      {message ? <span className="text-sm text-slate-600 dark:text-slate-300">{message}</span> : null}
    </div>
  );
}

async function parseJson(response: Response): Promise<{ error?: string }> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}
