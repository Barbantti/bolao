// Server-only helpers for the Bolão. Uses the admin client to bypass RLS
// because there is no end-user auth — all access goes through validated
// server functions.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export type DbMatchRow = {
  id: number;
  home_team_code: string | null;
  away_team_code: string | null;
  home_team_name: string;
  away_team_name: string;
  kickoff: string;
  stage: string;
  group_name: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
  venue: string | null;
};

export async function fetchAllMatches(): Promise<DbMatchRow[]> {
  const { data, error } = await supabaseAdmin
    .from("matches")
    .select(
      "id, home_team_code, away_team_code, home_team_name, away_team_name, kickoff, stage, group_name, status, home_score, away_score, venue",
    )
    .order("kickoff", { ascending: true })
    .limit(2000);
  if (error) throw new Error(error.message);
  return (data ?? []) as DbMatchRow[];
}

export { supabaseAdmin };
