"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { TEAM_OPTIONS } from "@/lib/constants";

export function MedalForm({
  defaults,
  disabled
}: {
  defaults?: { gold_team_code?: string; silver_team_code?: string; bronze_team_code?: string } | null;
  disabled: boolean;
}) {
  const [goldTeamCode, setGold] = useState(defaults?.gold_team_code ?? "CZE");
  const [silverTeamCode, setSilver] = useState(defaults?.silver_team_code ?? "CAN");
  const [bronzeTeamCode, setBronze] = useState(defaults?.bronze_team_code ?? "SWE");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setMessage(null);
    const response = await fetch("/api/predictions/medals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ goldTeamCode, silverTeamCode, bronzeTeamCode })
    });
    const payload = await response.json();
    setBusy(false);
    setMessage(response.ok ? "Uloženo" : payload.error ?? "Nepovedlo se uložit tip.");
  }

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
      <Select label="Zlato" value={goldTeamCode} onChange={setGold} disabled={disabled} />
      <Select label="Stříbro" value={silverTeamCode} onChange={setSilver} disabled={disabled} />
      <Select label="Bronz" value={bronzeTeamCode} onChange={setBronze} disabled={disabled} />
      <div>
        <button
          type="button"
          disabled={disabled || busy}
          onClick={save}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-rink-blue px-4 font-semibold text-white disabled:bg-slate-300"
        >
          <Save size={17} />
          Uložit
        </button>
        {message ? <p className="mt-2 text-sm text-slate-600">{message}</p> : null}
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
    <label className="block text-sm font-semibold text-ice-900">
      {label}
      <select
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-md border border-ice-100 bg-white px-3 disabled:bg-slate-100"
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
