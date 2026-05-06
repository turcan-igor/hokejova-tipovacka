const scheduleUrl = Deno.env.get("IIHF_SCHEDULE_URL") ??
  "https://www.iihf.com/en/events/2026/wm/schedule";
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const syncSecret = Deno.env.get("SYNC_SECRET");

Deno.serve(async (request) => {
  const actualSecret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (syncSecret && actualSecret !== syncSecret) {
    return json({ error: "Unauthorized" }, 401);
  }

  const startedAt = new Date().toISOString();
  try {
    const html = await fetch(scheduleUrl, {
      headers: { "user-agent": "iihf-2026-tipovacka/0.1" }
    }).then((response) => {
      if (!response.ok) throw new Error(`IIHF HTTP ${response.status}`);
      return response.text();
    });

    const matches = parseIihfScheduleHtml(html);
    await supabaseRest("matches", "POST", matches.map(toDbMatch), {
      Prefer: "resolution=merge-duplicates"
    });
    await supabaseRpc("recompute_scores");
    await supabaseRest("sync_runs", "POST", {
      source: "iihf",
      status: "success",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      matches_seen: matches.length
    });

    return json({ ok: true, matchesSeen: matches.length });
  } catch (error) {
    await supabaseRest("sync_runs", "POST", {
      source: "iihf",
      status: "error",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      error_message: error instanceof Error ? error.message : "Unknown error"
    }).catch(() => null);
    return json({ error: "Sync failed" }, 500);
  }
});

async function supabaseRest(table: string, method: string, body: unknown, extraHeaders: Record<string, string> = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}${table === "matches" ? "?on_conflict=iihf_game_id" : ""}`, {
    method,
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
      ...extraHeaders
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`Supabase ${table} HTTP ${response.status}: ${await response.text()}`);
  return response;
}

async function supabaseRpc(name: string) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json"
    },
    body: "{}"
  });
  if (!response.ok) throw new Error(`Supabase RPC HTTP ${response.status}: ${await response.text()}`);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

type ParsedMatch = {
  iihfGameId: string | null;
  phase: string;
  startsAt: string;
  venue: string | null;
  groupName: string | null;
  homeTeamCode: string | null;
  awayTeamCode: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
};

function toDbMatch(match: ParsedMatch) {
  return {
    iihf_game_id: match.iihfGameId ?? stableFallbackGameId(match),
    phase: match.phase,
    starts_at: match.startsAt,
    venue: match.venue,
    group_name: match.groupName,
    home_team_code: match.homeTeamCode,
    away_team_code: match.awayTeamCode,
    home_score: match.homeScore,
    away_score: match.awayScore,
    status: match.status,
    source_updated_at: new Date().toISOString()
  };
}

function stableFallbackGameId(match: ParsedMatch) {
  return [
    "fallback",
    match.startsAt,
    match.homeTeamCode ?? match.phase,
    match.awayTeamCode ?? match.venue ?? "unknown"
  ].join(":");
}

function parseIihfScheduleHtml(html: string) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const gameIds = Array.from(html.matchAll(/gamecenter\/playbyplay\/(\d+)\//g)).map((match) => match[1]);
  const parsed = [];
  for (let index = 0; index < lines.length; index += 1) {
    const dateMatch = lines[index].match(/^(\d{1,2})\s+(May)$/);
    if (!dateMatch) continue;
    const candidate = lines.slice(index, index + 24);
    const versusIndex = candidate.findIndex((line) => /^[A-Z()]+(?:\(QF\))?\s+vs\s+[A-Z()]+(?:\(QF\))?$/.test(line));
    if (versusIndex === -1) continue;
    const teams = candidate[versusIndex].split(" vs ");
    const time = candidate.find((line) => /^\d{1,2}:\d{2}$/.test(line));
    if (!time) continue;
    const venueLine = candidate[versusIndex + 1] ?? "";
    const statusSource = candidate.join(" ").toLowerCase();
    const scoreCandidates = candidate.slice(0, versusIndex).filter((line) => /^\d+$/.test(line)).map(Number);
    const status = statusSource.includes("final")
      ? "final"
      : statusSource.includes("upcoming")
        ? "scheduled"
        : statusSource.includes("live")
          ? "live"
          : "scheduled";
    parsed.push({
      iihfGameId: gameIds[parsed.length] ?? null,
      startsAt: toIsoDate(dateMatch[1], time),
      homeTeamCode: normalizeTeam(teams[0]),
      awayTeamCode: normalizeTeam(teams[1]),
      homeScore: status === "final" ? scoreCandidates[0] ?? null : null,
      awayScore: status === "final" ? scoreCandidates[1] ?? null : null,
      status,
      phase: inferPhase(teams[0], venueLine),
      venue: venueLine.split(",")[0] || null,
      groupName: venueLine.match(/Group\s+([AB])/)?.[1] ?? null
    });
  }
  return parsed;
}

function normalizeTeam(team: string) {
  const trimmed = team.trim();
  if (["QF", "W(QF)", "L(SF)", "W(SF)"].includes(trimmed)) return null;
  return /^[A-Z]{3}$/.test(trimmed) ? trimmed : null;
}

function inferPhase(homeTeam: string, venueLine: string) {
  if (homeTeam === "QF") return "Quarterfinals";
  if (homeTeam === "W(QF)") return "Semifinals";
  if (homeTeam === "L(SF)") return "Bronze Medal Game";
  if (homeTeam === "W(SF)") return "Gold Medal Game";
  return venueLine.includes("Group") ? "Preliminary Round" : "Playoffs";
}

function toIsoDate(day: string, time: string) {
  return new Date(Date.UTC(2026, 4, Number(day), Number(time.slice(0, 2)) - 2, Number(time.slice(3, 5)))).toISOString();
}
