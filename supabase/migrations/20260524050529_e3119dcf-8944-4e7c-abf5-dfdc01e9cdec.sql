
-- Profiles: restrict SELECT to owner only
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Requests: require authentication
DROP POLICY IF EXISTS "Users can view all pending requests" ON public.requests;
CREATE POLICY "Authenticated users can view pending requests"
  ON public.requests FOR SELECT
  TO authenticated
  USING (status = 'pending' OR auth.uid() = user_id);

-- OTP codes: deny all client access (server-side only via service role)
CREATE POLICY "No client SELECT on otp_codes"
  ON public.otp_codes FOR SELECT
  USING (false);
CREATE POLICY "No client INSERT on otp_codes"
  ON public.otp_codes FOR INSERT
  WITH CHECK (false);
CREATE POLICY "No client UPDATE on otp_codes"
  ON public.otp_codes FOR UPDATE
  USING (false);
CREATE POLICY "No client DELETE on otp_codes"
  ON public.otp_codes FOR DELETE
  USING (false);
