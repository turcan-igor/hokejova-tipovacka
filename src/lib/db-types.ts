import type { MatchStatus } from "@/lib/types";

export type ProfileRow = {
  id: string;
  email?: string;
  display_name: string;
  role?: "USER" | "ADMIN";
};

export type MatchRow = {
  id: string;
  iihf_game_id: string | null;
  phase: string;
  starts_at: string;
  venue: string | null;
  group_name: string | null;
  home_team_code: string | null;
  away_team_code: string | null;
  home_score: number | null;
  away_score: number | null;
  status: MatchStatus;
};

export type MatchPredictionRow = {
  id: string;
  user_id: string;
  match_id: string;
  home_score: number;
  away_score: number;
  points: number | null;
  is_exact: boolean;
};

export type MedalPredictionRow = {
  id: string;
  user_id: string;
  gold_team_code: string;
  silver_team_code: string;
  bronze_team_code: string;
  points: number | null;
};

export type FinalMedalsRow = {
  id: number;
  gold_team_code: string | null;
  silver_team_code: string | null;
  bronze_team_code: string | null;
};

export type SyncRunRow = {
  id: string;
  source: string;
  status: string;
  started_at: string;
  matches_seen: number | null;
  error_message: string | null;
};

export type InviteCodeRow = {
  id: string;
  code: string;
  is_active: boolean;
  max_uses: number | null;
  used_count: number;
  created_at: string;
};

export type AuditLogRow = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
};
