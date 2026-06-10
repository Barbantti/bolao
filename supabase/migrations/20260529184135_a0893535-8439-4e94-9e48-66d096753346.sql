
-- ============ TABLES ============

CREATE TABLE public.participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  total_points INTEGER NOT NULL DEFAULT 0,
  exact_count INTEGER NOT NULL DEFAULT 0,
  result_count INTEGER NOT NULL DEFAULT 0,
  goal_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.teams (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  flag_code TEXT,
  group_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.matches (
  id BIGINT PRIMARY KEY,
  home_team_code TEXT,
  away_team_code TEXT,
  home_team_name TEXT NOT NULL,
  away_team_name TEXT NOT NULL,
  kickoff TIMESTAMPTZ NOT NULL,
  stage TEXT NOT NULL,
  group_name TEXT,
  status TEXT NOT NULL DEFAULT 'SCHEDULED',
  home_score INTEGER,
  away_score INTEGER,
  venue TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_matches_kickoff ON public.matches(kickoff);
CREATE INDEX idx_matches_stage ON public.matches(stage);
CREATE INDEX idx_matches_status ON public.matches(status);

CREATE TABLE public.predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  match_id BIGINT NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  home_score INTEGER NOT NULL,
  away_score INTEGER NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  scored BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(participant_id, match_id)
);

CREATE INDEX idx_predictions_participant ON public.predictions(participant_id);
CREATE INDEX idx_predictions_match ON public.predictions(match_id);

CREATE TABLE public.sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  message TEXT,
  matches_synced INTEGER DEFAULT 0,
  predictions_scored INTEGER DEFAULT 0
);

CREATE TABLE public.settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ RANKING VIEW (email mascarado) ============

CREATE VIEW public.ranking_view AS
SELECT
  id,
  name,
  CASE
    WHEN position('@' in email) > 1 THEN
      substring(email, 1, 1) || '***' || substring(email, position('@' in email))
    ELSE '***'
  END AS email_masked,
  total_points,
  exact_count,
  result_count,
  goal_count,
  RANK() OVER (
    ORDER BY total_points DESC, exact_count DESC, result_count DESC, goal_count DESC, created_at ASC
  ) AS position
FROM public.participants;

-- ============ GRANTS ============

GRANT SELECT ON public.ranking_view TO anon, authenticated;
GRANT ALL ON public.ranking_view TO service_role;

GRANT ALL ON public.participants TO service_role;
GRANT ALL ON public.teams TO service_role;
GRANT ALL ON public.matches TO service_role;
GRANT ALL ON public.predictions TO service_role;
GRANT ALL ON public.sync_logs TO service_role;
GRANT ALL ON public.settings TO service_role;

-- Public read for teams and matches (jogos page is public)
GRANT SELECT ON public.teams TO anon, authenticated;
GRANT SELECT ON public.matches TO anon, authenticated;

-- ============ RLS ============

ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Teams and matches: public read
CREATE POLICY "Teams are publicly readable"
ON public.teams FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Matches are publicly readable"
ON public.matches FOR SELECT TO anon, authenticated USING (true);

-- All writes (and reads of sensitive tables) go through server fns with service_role,
-- which bypasses RLS. No anon/authenticated policies on participants, predictions,
-- sync_logs, settings.

-- ============ TRIGGERS ============

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_participants_updated BEFORE UPDATE ON public.participants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_matches_updated BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_predictions_updated BEFORE UPDATE ON public.predictions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ REALTIME ============

ALTER PUBLICATION supabase_realtime ADD TABLE public.participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
