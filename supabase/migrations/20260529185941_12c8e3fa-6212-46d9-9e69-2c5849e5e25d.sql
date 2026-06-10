ALTER TABLE public.predictions REPLICA IDENTITY FULL;
ALTER TABLE public.participants REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.predictions;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;