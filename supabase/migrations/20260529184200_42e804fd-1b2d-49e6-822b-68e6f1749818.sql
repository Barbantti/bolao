
DROP VIEW IF EXISTS public.ranking_view;

CREATE VIEW public.ranking_view
WITH (security_invoker = on) AS
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

GRANT SELECT ON public.ranking_view TO anon, authenticated;
GRANT ALL ON public.ranking_view TO service_role;

-- ranking_view reads participants. Allow anon/authenticated to read the
-- columns exposed by the view (name, masked email, points). Service-role
-- still bypasses RLS for full access.
CREATE POLICY "Ranking is publicly readable"
ON public.participants FOR SELECT TO anon, authenticated USING (true);
