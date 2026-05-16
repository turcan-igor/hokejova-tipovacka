"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { TEAM_OPTIONS } from "@/lib/constants";

type MedalDefaults = {
  gold_team_code?: string | null;
  silver_team_code?: string | null;
  bronze_team_code?: string | null;
};

export function MedalForm({
  defaults,
  disabled
}: {
  defaults?: MedalDefaults | null;
  disabled: boolean;
}) {
  const hasSavedPrediction = Boolean(defaults?.gold_team_code && defaults.silver_team_code && defaults.bronze_team_code);
  const [goldTeamCode, setGold] = useState(defaults?.gold_team_code ?? "CZE");
  const [silverTeamCode, setSilver] = useState(defaults?.silver_team_code ?? "CAN");
  const [bronzeTeamCode, setBronze] = useState(defaults?.bronze_team_code ?? "SWE");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (disabled && !hasSavedPrediction) {
    return <p className="rounded-md bg-ice-100 px-3 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">Netipováno</p>;
  }

  async function save() {
    setMessage(null);
    if (new Set([goldTeamCode, silverTeamCode, bronzeTeamCode]).size < 3) {
      setMessage("Každý tým lze vybrat jen jednou.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/predictions/medals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ goldTeamCode, silverTeamCode, bronzeTeamCode })
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
    <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
      <Select label="Zlato" value={goldTeamCode} onChange={setGold} disabled={controlsDisabled} />
      <Select label="Stříbro" value={silverTeamCode} onChange={setSilver} disabled={controlsDisabled} />
      <Select label="Bronz" value={bronzeTeamCode} onChange={setBronze} disabled={controlsDisabled} />
      <div>
        <button
          type="button"
          disabled={controlsDisabled}
          onClick={save}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-rink-blue px-4 font-semibold text-white disabled:bg-slate-300 dark:disabled:bg-slate-700"
        >
          <Save size={17} />
          {busy ? "Ukládám..." : "Uložit"}
        </button>
        {message ? <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{message}</p> : null}
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  disabled
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <label className="block text-sm font-semibold text-ice-900 dark:text-slate-100">
      {label}
      <select
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-md border border-ice-100 bg-white px-3 disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:disabled:bg-slate-800"
      >
        {TEAM_OPTIONS.map((team) => (
          <option key={team.code} value={team.code}>
            {team.name}
          </option>
        ))}
      </select>
    </label>
  );
}

async function parseJson(response: Response): Promise<{ error?: string }> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}
