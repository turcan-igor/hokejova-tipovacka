const scheduleUrl = Deno.env.get("IIHF_SCHEDULE_URL") ??
  "https://www.iihf.com/en/events/2026/wm/schedule";
const statsScheduleUrl = Deno.env.get("IIHF_STATS_SCHEDULE_URL") ??
  "https://stats.iihf.com/Hydra/969/index.html";
const playerStatsUrl = "https://www.iihf.com/en/events/2026/wm/skaters/scoringleaders";
const standingsUrl = "https://www.iihf.com/en/events/2026/wm/standings/group";
const tournamentTimeZone = "Europe/Zurich";
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
    const matches = await fetchMatches();

    await supabaseRest("matches", "POST", matches.map(toDbMatch), {
      Prefer: "resolution=merge-duplicates"
    });
    await supabaseRpc("recompute_scores");
    const playerStats = await fetchPlayerStats();
    if (playerStats.length > 0) {
      await supabaseRest("player_stats", "POST", playerStats.map(toDbPlayerStat), {
        Prefer: "resolution=merge-duplicates"
      });
    }
    const iihfStandings = await fetchGroupStandings();
    const groupStandings = iihfStandings.length > 0 ? iihfStandings : calculateFallbackGroupStandings(matches);
    if (groupStandings.length > 0) {
      await supabaseRest("group_standings", "POST", groupStandings.map(toDbGroupStanding), {
        Prefer: "resolution=merge-duplicates"
      });
    }
    await supabaseRest("sync_runs", "POST", {
      source: "iihf",
      status: "success",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      matches_seen: matches.length
    });

    return json({
      ok: true,
      matchesSeen: matches.length,
      playerStatsSeen: playerStats.length,
      groupStandingsSeen: groupStandings.length,
      groupStandingsSource: iihfStandings.length > 0 ? "iihf" : "fallback"
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await supabaseRest("sync_runs", "POST", {
      source: "iihf",
      status: "error",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      error_message: errorMessage
    }).catch(() => null);
    return json({ error: "Sync failed", detail: errorMessage }, 500);
  }
});

async function fetchMatches() {
  const statsResponse = await fetch(statsScheduleUrl, {
    headers: { "user-agent": "iihf-2026-tipovacka/0.1" }
  });
  if (statsResponse.ok) {
    const parsed = parseIihfStatsScheduleHtml(await statsResponse.text());
    if (parsed.length > 0) return parsed;
  }

  const response = await fetch(scheduleUrl, {
    headers: { "user-agent": "iihf-2026-tipovacka/0.1" }
  });

  if (response.status === 403) return getStaticSchedule();
  if (!response.ok) throw new Error(`IIHF HTTP ${response.status}`);
  const parsed = parseIihfScheduleHtml(await response.text());
  return parsed.length > 0 ? parsed : getStaticSchedule();
}

async function supabaseRest(table: string, method: string, body: unknown, extraHeaders: Record<string, string> = {}) {
  const conflict = table === "matches"
    ? "?on_conflict=iihf_game_id"
    : table === "player_stats"
      ? "?on_conflict=player_name,team_code"
      : table === "group_standings"
        ? "?on_conflict=group_name,team_code"
      : "";
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}${conflict}`, {
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

type PlayerStat = {
  playerName: string;
  teamCode: string;
  position: string | null;
  gamesPlayed: number;
  goals: number;
  assists: number;
  points: number;
  plusMinus: string | null;
  penaltyMinutes: number | null;
  source: string;
};

type GroupStanding = {
  groupName: string;
  rank: number;
  teamCode: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  source: "iihf" | "fallback";
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

function toDbPlayerStat(stat: PlayerStat) {
  return {
    player_name: stat.playerName,
    team_code: stat.teamCode,
    position: stat.position,
    games_played: stat.gamesPlayed,
    goals: stat.goals,
    assists: stat.assists,
    points: stat.points,
    plus_minus: stat.plusMinus,
    penalty_minutes: stat.penaltyMinutes,
    source: stat.source,
    updated_at: new Date().toISOString()
  };
}

function toDbGroupStanding(row: GroupStanding) {
  return {
    group_name: row.groupName,
    rank: row.rank,
    team_code: row.teamCode,
    games_played: row.gamesPlayed,
    wins: row.wins,
    losses: row.losses,
    goals_for: row.goalsFor,
    goals_against: row.goalsAgainst,
    goal_difference: row.goalDifference,
    points: row.points,
    source: row.source,
    updated_at: new Date().toISOString()
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

function parseIihfStatsScheduleHtml(html: string) {
  const lines = toTextLines(html);
  const parsed: ParsedMatch[] = [];
  let currentDate: { day: string } | null = null;
  let currentTime: string | null = null;
  let currentVenue: string | null = null;
  let currentGameNumber: string | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const dateMatch = line.match(/^(\d{1,2})\s+May\s+2026/);
    if (dateMatch) {
      currentDate = { day: dateMatch[1] };
      continue;
    }

    const timeMatch = line.match(/^(\d{1,2}:\d{2})\s+GMT\+2/);
    if (timeMatch) {
      currentTime = timeMatch[1];
      continue;
    }

    const venueWithGameMatch = line.match(/^(Swiss Life Arena|BCF Arena)\s+(\d+)$/);
    if (venueWithGameMatch) {
      currentVenue = venueWithGameMatch[1];
      currentGameNumber = venueWithGameMatch[2];
      continue;
    }

    const venueMatch = line.match(/^(Swiss Life Arena|BCF Arena)$/);
    if (venueMatch) {
      currentVenue = venueMatch[1];
      continue;
    }

    if (currentVenue && /^\d+$/.test(line)) {
      currentGameNumber = line;
      continue;
    }

    const combinedMatchLine = line.match(/^(PRE|QF|SF|BMG|GMG)\s+([A-Z()]+(?:\(QF\))?)\s+-\s+([A-Z()]+(?:\(QF\))?)(?:\s+(.+))?$/);
    const tokenizedMatchLine = /^(PRE|QF|SF|BMG|GMG)$/.test(line) && lines[index + 2] === "-"
      ? [line, line, lines[index + 1], lines[index + 3], lines[index + 4] ?? ""]
      : null;
    const matchLine = combinedMatchLine ?? tokenizedMatchLine;
    if (!matchLine || !currentDate || !currentTime) continue;

    const [, phaseCode, homeRaw, awayRaw, resultRaw = ""] = matchLine;
    const scoreMatch = resultRaw.match(/(\d+)\s+-\s+(\d+)/);
    const nextStatusLines = lines.slice(index + 1, index + 12).join(" ").toLowerCase();
    const source = `${resultRaw} ${nextStatusLines}`.toLowerCase();
    const status = source.includes("completed")
      ? "final"
      : source.includes("period") || source.includes("live")
        ? "live"
        : "scheduled";

    parsed.push({
      iihfGameId: currentGameNumber ? `static-2026-${currentGameNumber.padStart(2, "0")}` : null,
      startsAt: toIsoDate(currentDate.day, currentTime),
      homeTeamCode: normalizeTeam(homeRaw),
      awayTeamCode: normalizeTeam(awayRaw),
      homeScore: scoreMatch ? Number(scoreMatch[1]) : null,
      awayScore: scoreMatch ? Number(scoreMatch[2]) : null,
      status,
      phase: phaseFromCode(phaseCode),
      venue: currentVenue,
      groupName: inferGroup(normalizeTeam(homeRaw), normalizeTeam(awayRaw))
    });
  }

  return dedupeMatches(parsed);
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

function phaseFromCode(code: string) {
  if (code === "QF") return "Quarterfinals";
  if (code === "SF") return "Semifinals";
  if (code === "BMG") return "Bronze Medal Game";
  if (code === "GMG") return "Gold Medal Game";
  return "Preliminary Round";
}

const GROUP_A_TEAMS = new Set(["AUT", "FIN", "GBR", "GER", "HUN", "LAT", "SUI", "USA"]);
const GROUP_B_TEAMS = new Set(["CAN", "CZE", "DEN", "ITA", "NOR", "SLO", "SVK", "SWE"]);

function inferGroup(homeTeamCode: string | null, awayTeamCode: string | null) {
  if (homeTeamCode && awayTeamCode && GROUP_A_TEAMS.has(homeTeamCode) && GROUP_A_TEAMS.has(awayTeamCode)) return "A";
  if (homeTeamCode && awayTeamCode && GROUP_B_TEAMS.has(homeTeamCode) && GROUP_B_TEAMS.has(awayTeamCode)) return "B";
  return null;
}

function dedupeMatches(matches: ParsedMatch[]) {
  const seen = new Set<string>();
  return matches.filter((match) => {
    const key = `${match.startsAt}:${match.homeTeamCode ?? match.phase}:${match.awayTeamCode ?? match.venue}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toIsoDate(day: string, time: string) {
  const [hour, minute] = time.split(":").map(Number);
  const initialUtc = Date.UTC(2026, 4, Number(day), hour, minute);
  const offset = getTimeZoneOffsetMs(new Date(initialUtc), tournamentTimeZone);
  return new Date(initialUtc - offset).toISOString();
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second)
  );
  return asUtc - date.getTime();
}

function toTextLines(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\u00a0/g, " ")
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\s+/g, " "))
    .filter(Boolean);
}

async function fetchPlayerStats() {
  const response = await fetch(playerStatsUrl, {
    headers: { "user-agent": "iihf-2026-tipovacka/0.1" }
  });
  if (response.status === 403 || response.status === 404) return [];
  if (!response.ok) throw new Error(`IIHF player stats HTTP ${response.status}`);
  return parsePlayerStatsHtml(await response.text(), playerStatsUrl);
}

async function fetchGroupStandings() {
  const response = await fetch(standingsUrl, {
    headers: { "user-agent": "iihf-2026-tipovacka/0.1" }
  });
  if (response.status === 403 || response.status === 404) return [];
  if (!response.ok) throw new Error(`IIHF standings HTTP ${response.status}`);
  return parseGroupStandingsHtml(await response.text());
}

const TEAM_CODE_PATTERN = /\b(AUT|CAN|CZE|DEN|FIN|GBR|GER|HUN|ITA|LAT|NOR|SLO|SUI|SVK|SWE|USA)\b/;

function parsePlayerStatsHtml(html: string, source: string) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const stats: PlayerStat[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const name = lines[index];
    const position = lines[index + 1];
    if (!/^[A-Z][A-Z' -]+ [A-Z][A-Za-z' -]+$/.test(name) || !["Forward", "Defender"].includes(position)) continue;

    const window = lines.slice(index, index + 80);
    const teamCode = window.find((line) => TEAM_CODE_PATTERN.test(line))?.match(TEAM_CODE_PATTERN)?.[1];
    const statHeaderIndex = window.findIndex((line) => /^gp\s+g\s+a\s+pts/i.test(line.replace(/\s+/g, " ")));
    const statLine = statHeaderIndex >= 0 ? window[statHeaderIndex + 1] : null;
    if (!teamCode || !statLine) continue;

    const values = statLine.split(/\s+/);
    const gamesPlayed = Number(values[0]);
    const goals = Number(values[1]);
    const assists = Number(values[2]);
    const points = Number(values[3]);
    const penaltyMinutes = Number(values[4]);
    if (![gamesPlayed, goals, assists, points].every(Number.isFinite)) continue;

    stats.push({
      playerName: name,
      teamCode,
      position,
      gamesPlayed,
      goals,
      assists,
      points,
      penaltyMinutes: Number.isFinite(penaltyMinutes) ? penaltyMinutes : null,
      plusMinus: values[6] ?? null,
      source
    });
  }

  const seen = new Set<string>();
  return stats.filter((stat) => {
    const key = `${stat.playerName}:${stat.teamCode}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseGroupStandingsHtml(html: string): GroupStanding[] {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const standings: GroupStanding[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const groupMatch = lines[index].match(/^Group\s+([AB])$/);
    if (!groupMatch) continue;

    const groupName = groupMatch[1];
    const remainingLines = lines.slice(index + 1);
    const nextGroupIndex = remainingLines.findIndex((line) => /^Group\s+[AB]$/.test(line));
    const window = nextGroupIndex >= 0 ? remainingLines.slice(0, nextGroupIndex) : remainingLines.slice(0, 80);
    const teams = window.filter((line) => TEAM_CODE_PATTERN.test(line));
    const statLines = window
      .filter((line) => /^\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+:\d+$/.test(line))
      .map((line) => line.split(/\s+/));

    for (let rankIndex = 0; rankIndex < Math.min(teams.length, statLines.length); rankIndex += 1) {
      const stats = statLines[rankIndex];
      const [gamesPlayed, points, wins, overtimeWins, overtimeLosses, losses] = stats.slice(0, 6).map(Number);
      const [goalsFor, goalsAgainst] = stats[6].split(":").map(Number);
      standings.push({
        groupName,
        rank: rankIndex + 1,
        teamCode: teams[rankIndex],
        gamesPlayed,
        wins: wins + overtimeWins,
        losses: losses + overtimeLosses,
        goalsFor,
        goalsAgainst,
        goalDifference: goalsFor - goalsAgainst,
        points,
        source: "iihf"
      });
    }
  }

  return standings;
}

function calculateFallbackGroupStandings(matches: ParsedMatch[]): GroupStanding[] {
  const rows = new Map<string, GroupStanding>();

  for (const match of matches) {
    if (
      match.phase !== "Preliminary Round" ||
      match.status !== "final" ||
      !match.groupName ||
      !match.homeTeamCode ||
      !match.awayTeamCode ||
      match.homeScore === null ||
      match.awayScore === null
    ) {
      continue;
    }

    const home = ensureStanding(rows, match.groupName, match.homeTeamCode);
    const away = ensureStanding(rows, match.groupName, match.awayTeamCode);

    home.gamesPlayed += 1;
    away.gamesPlayed += 1;
    home.goalsFor += match.homeScore;
    home.goalsAgainst += match.awayScore;
    away.goalsFor += match.awayScore;
    away.goalsAgainst += match.homeScore;

    if (match.homeScore > match.awayScore) {
      home.wins += 1;
      home.points += 3;
      away.losses += 1;
    } else {
      away.wins += 1;
      away.points += 3;
      home.losses += 1;
    }
  }

  const grouped = Array.from(rows.values()).reduce<Record<string, GroupStanding[]>>((acc, row) => {
    row.goalDifference = row.goalsFor - row.goalsAgainst;
    acc[row.groupName] ??= [];
    acc[row.groupName].push(row);
    return acc;
  }, {});

  return Object.values(grouped).flatMap((groupRows) =>
    groupRows
      .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || a.teamCode.localeCompare(b.teamCode))
      .map((row, index) => ({ ...row, rank: index + 1 }))
  );
}

function ensureStanding(rows: Map<string, GroupStanding>, groupName: string, teamCode: string) {
  const key = `${groupName}:${teamCode}`;
  if (!rows.has(key)) {
    rows.set(key, {
      groupName,
      rank: 0,
      teamCode,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      source: "fallback"
    });
  }
  return rows.get(key)!;
}

type StaticMatch = {
  day: number;
  time: string;
  home: string | null;
  away: string | null;
  venue: "Swiss Life Arena" | "BCF Arena";
  group: "A" | "B" | null;
  phase: string;
};

const STATIC_MATCHES: StaticMatch[] = [
  m(15, "16:20", "FIN", "GER", "Swiss Life Arena", "A"),
  m(15, "16:20", "CAN", "SWE", "BCF Arena", "B"),
  m(15, "20:20", "USA", "SUI", "Swiss Life Arena", "A"),
  m(15, "20:20", "CZE", "DEN", "BCF Arena", "B"),
  m(16, "12:20", "GBR", "AUT", "Swiss Life Arena", "A"),
  m(16, "12:20", "SVK", "NOR", "BCF Arena", "B"),
  m(16, "16:20", "HUN", "FIN", "Swiss Life Arena", "A"),
  m(16, "16:20", "ITA", "CAN", "BCF Arena", "B"),
  m(16, "20:20", "SUI", "LAT", "Swiss Life Arena", "A"),
  m(16, "20:20", "SLO", "CZE", "BCF Arena", "B"),
  m(17, "12:20", "GBR", "USA", "Swiss Life Arena", "A"),
  m(17, "12:20", "ITA", "SVK", "BCF Arena", "B"),
  m(17, "16:20", "AUT", "HUN", "Swiss Life Arena", "A"),
  m(17, "16:20", "DEN", "SWE", "BCF Arena", "B"),
  m(17, "20:20", "GER", "LAT", "Swiss Life Arena", "A"),
  m(17, "20:20", "NOR", "SLO", "BCF Arena", "B"),
  m(18, "16:20", "FIN", "USA", "Swiss Life Arena", "A"),
  m(18, "16:20", "CAN", "DEN", "BCF Arena", "B"),
  m(18, "20:20", "GER", "SUI", "Swiss Life Arena", "A"),
  m(18, "20:20", "SWE", "CZE", "BCF Arena", "B"),
  m(19, "16:20", "LAT", "AUT", "Swiss Life Arena", "A"),
  m(19, "16:20", "ITA", "NOR", "BCF Arena", "B"),
  m(19, "20:20", "HUN", "GBR", "Swiss Life Arena", "A"),
  m(19, "20:20", "SLO", "SVK", "BCF Arena", "B"),
  m(20, "16:20", "AUT", "SUI", "Swiss Life Arena", "A"),
  m(20, "16:20", "CZE", "ITA", "BCF Arena", "B"),
  m(20, "20:20", "USA", "GER", "Swiss Life Arena", "A"),
  m(20, "20:20", "SWE", "SLO", "BCF Arena", "B"),
  m(21, "16:20", "LAT", "FIN", "Swiss Life Arena", "A"),
  m(21, "16:20", "CAN", "NOR", "BCF Arena", "B"),
  m(21, "20:20", "SUI", "GBR", "Swiss Life Arena", "A"),
  m(21, "20:20", "DEN", "SVK", "BCF Arena", "B"),
  m(22, "16:20", "GER", "HUN", "Swiss Life Arena", "A"),
  m(22, "16:20", "CAN", "SLO", "BCF Arena", "B"),
  m(22, "20:20", "FIN", "GBR", "Swiss Life Arena", "A"),
  m(22, "20:20", "SWE", "ITA", "BCF Arena", "B"),
  m(23, "12:20", "LAT", "USA", "Swiss Life Arena", "A"),
  m(23, "12:20", "DEN", "SLO", "BCF Arena", "B"),
  m(23, "16:20", "SUI", "HUN", "Swiss Life Arena", "A"),
  m(23, "16:20", "SVK", "CZE", "BCF Arena", "B"),
  m(23, "20:20", "AUT", "GER", "Swiss Life Arena", "A"),
  m(23, "20:20", "NOR", "SWE", "BCF Arena", "B"),
  m(24, "16:20", "GBR", "LAT", "Swiss Life Arena", "A"),
  m(24, "16:20", "DEN", "ITA", "BCF Arena", "B"),
  m(24, "20:20", "FIN", "AUT", "Swiss Life Arena", "A"),
  m(24, "20:20", "SVK", "CAN", "BCF Arena", "B"),
  m(25, "16:20", "USA", "HUN", "Swiss Life Arena", "A"),
  m(25, "16:20", "CZE", "NOR", "BCF Arena", "B"),
  m(25, "20:20", "GER", "GBR", "Swiss Life Arena", "A"),
  m(25, "20:20", "SLO", "ITA", "BCF Arena", "B"),
  m(26, "12:20", "HUN", "LAT", "Swiss Life Arena", "A"),
  m(26, "12:20", "NOR", "DEN", "BCF Arena", "B"),
  m(26, "16:20", "USA", "AUT", "Swiss Life Arena", "A"),
  m(26, "16:20", "SWE", "SVK", "BCF Arena", "B"),
  m(26, "20:20", "SUI", "FIN", "Swiss Life Arena", "A"),
  m(26, "20:20", "CZE", "CAN", "BCF Arena", "B"),
  playoff(28, "16:20", "Swiss Life Arena", "Quarterfinals"),
  playoff(28, "16:20", "BCF Arena", "Quarterfinals"),
  playoff(28, "20:20", "Swiss Life Arena", "Quarterfinals"),
  playoff(28, "20:20", "BCF Arena", "Quarterfinals"),
  playoff(30, "15:20", "Swiss Life Arena", "Semifinals"),
  playoff(30, "20:00", "Swiss Life Arena", "Semifinals"),
  playoff(31, "15:30", "Swiss Life Arena", "Bronze Medal Game"),
  playoff(31, "20:20", "Swiss Life Arena", "Gold Medal Game")
];

function getStaticSchedule(): ParsedMatch[] {
  return STATIC_MATCHES.map((match, index) => ({
    iihfGameId: `static-2026-${String(index + 1).padStart(2, "0")}`,
    startsAt: toIsoDate(String(match.day), match.time),
    homeTeamCode: match.home,
    awayTeamCode: match.away,
    homeScore: null,
    awayScore: null,
    status: "scheduled",
    phase: match.phase,
    venue: match.venue,
    groupName: match.group
  }));
}

function m(
  day: number,
  time: string,
  home: string,
  away: string,
  venue: StaticMatch["venue"],
  group: "A" | "B"
): StaticMatch {
  return { day, time, home, away, venue, group, phase: "Preliminary Round" };
}

function playoff(day: number, time: string, venue: StaticMatch["venue"], phase: string): StaticMatch {
  return { day, time, home: null, away: null, venue, group: null, phase };
}
