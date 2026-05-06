export type MatchStatus = "scheduled" | "live" | "final" | "postponed" | "cancelled";

export type Match = {
  id: string;
  iihf_game_id: string | null;
  phase: string;
  starts_at: string;
  venue: string | null;
  group_name: string | null;
  home_team_code: string | null;
  away_team_code: string | null;
  home_team_name: string | null;
  away_team_name: string | null;
  home_score: number | null;
  away_score: number | null;
  status: MatchStatus;
};

export type MatchPrediction = {
  match_id: string;
  home_score: number;
  away_score: number;
  points: number | null;
};

export type MedalPrediction = {
  gold_team_code: string;
  silver_team_code: string;
  bronze_team_code: string;
  points: number | null;
};

export type FinalMedals = {
  gold_team_code: string | null;
  silver_team_code: string | null;
  bronze_team_code: string | null;
};

export type LeaderboardRow = {
  user_id: string;
  display_name: string;
  match_points: number;
  medal_points: number;
  total_points: number;
  exact_scores: number;
  rank: number;
};
