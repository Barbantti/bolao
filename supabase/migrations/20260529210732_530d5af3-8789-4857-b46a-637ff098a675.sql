
-- 1) participants: revoke public/anon SELECT (email is sensitive). Ranking served via ranking_view through server functions.
DROP POLICY IF EXISTS "Ranking is publicly readable" ON public.participants;
REVOKE SELECT ON public.participants FROM anon;

-- 2) Remove participants and predictions from realtime publication (would leak data via realtime stream).
ALTER PUBLICATION supabase_realtime DROP TABLE public.participants;
ALTER PUBLICATION supabase_realtime DROP TABLE public.predictions;

-- 3) Explicit deny-all policies on settings and sync_logs (defense-in-depth; server uses service_role which bypasses RLS).
CREATE POLICY "Deny all client access to settings"
  ON public.settings FOR SELECT TO anon, authenticated USING (false);

CREATE POLICY "Deny all client access to sync_logs"
  ON public.sync_logs FOR SELECT TO anon, authenticated USING (false);

-- 4) predictions: explicit deny-all SELECT for defense-in-depth.
CREATE POLICY "Deny all client access to predictions"
  ON public.predictions FOR SELECT TO anon, authenticated USING (false);
