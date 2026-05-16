import { Matchup, TeamBadge } from "@/components/team-badge";
import { PageShell } from "@/components/page-shell";
import { requireUser } from "@/lib/auth";
import type { GroupStandingRow, MatchRow } from "@/lib/db-types";
import { calculateFallbackGroupStandings, groupStandingsByGroup, type GroupStanding } from "@/lib/group-standings";
import { getPlayoffBracket } from "@/lib/playoff-bracket";
import { formatTournamentDateTime } from "@/lib/time-zone";

type StandingViewRow = {
  group_name: string;
  rank: number;
  team_code: string;
  games_played: number;
  wins: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
  source: string | null;
};

export default async function GroupsPage() {
  const { supabase, profile } = await requireUser();
  const [{ data: standingsData }, { data: matchesData }] = await Promise.all([
    supabase
      .from("group_standings")
      .select("id,group_name,rank,team_code,games_played,wins,losses,goals_for,goals_against,goal_difference,points,source,updated_at")
      .order("group_name", { ascending: true })
      .order("rank", { ascending: true }),
    supabase
      .from("matches")
      .select("id,iihf_game_id,phase,starts_at,venue,group_name,home_team_code,away_team_code,home_score,away_score,status")
      .order("starts_at", { ascending: true })
  ]);

  const matches = (matchesData ?? []) as MatchRow[];
  const storedStandings = (standingsData ?? []) as GroupStandingRow[];
  const fallbackStandings = storedStandings.length === 0 ? calculateFallbackGroupStandings(matches).map(toStandingViewRow) : [];
  const standings: StandingViewRow[] = storedStandings.length > 0 ? storedStandings : fallbackStandings;
  const standingsByGroup = groupStandingsByGroup(standings);
  const bracket = getPlayoffBracket(matches);
  const source = standings[0]?.source ?? null;

  return (
    <PageShell isAdmin={profile.role === "ADMIN"}>
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase text-rink-blue dark:text-sky-300">Turnaj</p>
        <h1 className="mt-2 text-3xl font-bold text-ice-900 dark:text-slate-100">Skupiny a playoff</h1>
        {source === "fallback" ? (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Tabulka je vypočtena z dostupných výsledků. Jakmile půjde načíst oficiální IIHF tabulku, sync ji použije přednostně.
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {["A", "B"].map((groupName) => (
          <section
            key={groupName}
            className="rounded-lg border border-ice-100 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900"
          >
            <h2 className="mb-4 text-xl font-bold text-ice-900 dark:text-slate-100">Skupina {groupName}</h2>
            <StandingsTable rows={standingsByGroup[groupName] ?? []} />
          </section>
        ))}
      </div>

      <section className="mt-6 rounded-lg border border-ice-100 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-4 text-xl font-bold text-ice-900 dark:text-slate-100">Playoff pavouk</h2>
        {bracket.length === 0 ? (
          <p className="text-slate-700 dark:text-slate-300">
            Playoff zápasy zatím nejsou v rozpisu načtené. Po synchronizaci se zde zobrazí čtvrtfinále, semifinále a medailové zápasy.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-4">
            {bracket.map((round) => (
              <div key={round.label}>
                <h3 className="mb-3 text-sm font-bold uppercase text-rink-blue dark:text-sky-300">{round.label}</h3>
                <div className="grid gap-3">
                  {round.matches.map((match) => (
                    <article key={match.id} className="rounded-md border border-ice-100 p-3 dark:border-slate-700">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {formatTournamentDateTime(match.starts_at, {
                          weekday: "short",
                          day: "numeric",
                          month: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </p>
                      <div className="mt-2">
                        <Matchup homeTeamCode={match.home_team_code} awayTeamCode={match.away_team_code} />
                      </div>
                      <p className="mt-3 text-sm font-semibold text-ice-900 dark:text-slate-100">
                        {match.status === "final" ? `${match.home_score}:${match.away_score}` : match.status}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}

function StandingsTable({ rows }: { rows: StandingViewRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-slate-700 dark:text-slate-300">
        Tabulka zatím není dostupná. Objeví se po syncu IIHF tabulek nebo po prvních finálních výsledcích ve skupině.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto table-scroll">
      <table className="min-w-[560px] w-full text-left text-sm">
        <thead className="bg-ice-100 text-ice-900 dark:bg-slate-800 dark:text-slate-100">
          <tr>
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2">Tým</th>
            <th className="px-3 py-2">Z</th>
            <th className="px-3 py-2">V</th>
            <th className="px-3 py-2">P</th>
            <th className="px-3 py-2">Skóre</th>
            <th className="px-3 py-2">+/-</th>
            <th className="px-3 py-2">B</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.group_name}-${row.team_code}`} className="border-t border-ice-100 dark:border-slate-700">
              <td className="px-3 py-3 font-semibold">{row.rank}</td>
              <td className="px-3 py-3">
                <TeamBadge code={row.team_code} />
              </td>
              <td className="px-3 py-3">{row.games_played}</td>
              <td className="px-3 py-3">{row.wins}</td>
              <td className="px-3 py-3">{row.losses}</td>
              <td className="px-3 py-3">
                {row.goals_for}:{row.goals_against}
              </td>
              <td className="px-3 py-3">{row.goal_difference}</td>
              <td className="px-3 py-3 text-lg font-bold text-rink-blue dark:text-sky-300">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function toStandingViewRow(row: GroupStanding): StandingViewRow {
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
    source: row.source
  };
}
