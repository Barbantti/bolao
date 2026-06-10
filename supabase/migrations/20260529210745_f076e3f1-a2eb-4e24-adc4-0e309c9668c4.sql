
CREATE POLICY "Deny all client access to participants"
  ON public.participants FOR SELECT TO anon, authenticated USING (false);
