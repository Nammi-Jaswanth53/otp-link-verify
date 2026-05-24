ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS balance NUMERIC NOT NULL DEFAULT 5000;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS user_name TEXT NOT NULL DEFAULT 'User';
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS location_address TEXT NOT NULL DEFAULT '';

-- Allow users to delete their own pending requests (for cancel)
DROP POLICY IF EXISTS "Users can delete their own requests" ON public.requests;
CREATE POLICY "Users can delete their own requests"
ON public.requests
FOR DELETE
USING (auth.uid() = user_id);