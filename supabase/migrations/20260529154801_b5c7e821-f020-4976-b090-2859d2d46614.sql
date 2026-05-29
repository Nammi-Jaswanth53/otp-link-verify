-- Ratings table
CREATE TABLE public.ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rater_id UUID NOT NULL,
  rated_user_id UUID NOT NULL,
  match_id UUID,
  stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.ratings TO authenticated;
GRANT ALL ON public.ratings TO service_role;

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view ratings"
ON public.ratings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert their own ratings"
ON public.ratings FOR INSERT TO authenticated
WITH CHECK (auth.uid() = rater_id AND rater_id <> rated_user_id);

-- Reports table
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL,
  reported_user_id UUID NOT NULL,
  match_id UUID,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reports"
ON public.reports FOR SELECT TO authenticated
USING (auth.uid() = reporter_id);

CREATE POLICY "Users can submit reports"
ON public.reports FOR INSERT TO authenticated
WITH CHECK (auth.uid() = reporter_id AND reporter_id <> reported_user_id);

CREATE INDEX idx_ratings_rated_user ON public.ratings(rated_user_id);
CREATE INDEX idx_reports_reported_user ON public.reports(reported_user_id);