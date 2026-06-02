
-- 1. Tighten matches INSERT
DROP POLICY IF EXISTS "Users can insert matches" ON public.matches;
CREATE POLICY "Users can insert matches"
ON public.matches FOR INSERT TO authenticated
WITH CHECK (
  (auth.uid() = user1_id OR auth.uid() = user2_id)
  AND EXISTS (SELECT 1 FROM public.requests r WHERE r.id = request1_id AND r.user_id = user1_id)
  AND EXISTS (SELECT 1 FROM public.requests r WHERE r.id = request2_id AND r.user_id = user2_id)
);

-- 2. Block client-side balance changes on profiles
CREATE OR REPLACE FUNCTION public.prevent_profile_balance_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.balance IS DISTINCT FROM OLD.balance
     AND coalesce(current_setting('request.jwt.claim.role', true), auth.role()) <> 'service_role' THEN
    RAISE EXCEPTION 'balance can only be modified by server-side logic';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_balance_change ON public.profiles;
CREATE TRIGGER profiles_prevent_balance_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_balance_change();

-- 3. Tighten ratings INSERT to require participation in the referenced match
DROP POLICY IF EXISTS "Users can insert their own ratings" ON public.ratings;
CREATE POLICY "Users can insert their own ratings"
ON public.ratings FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = rater_id
  AND rater_id <> rated_user_id
  AND match_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_id
      AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
      AND (m.user1_id = rated_user_id OR m.user2_id = rated_user_id)
  )
);

-- 4. Remove client INSERT on transactions; only service role (via edge function) may insert
DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.transactions;
REVOKE INSERT ON public.transactions FROM authenticated, anon;
GRANT INSERT ON public.transactions TO service_role;
