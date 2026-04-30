-- Restrict admin write policy on app_updates to authenticated users only
DROP POLICY IF EXISTS "Admins can manage updates" ON public.app_updates;
CREATE POLICY "Admins can manage updates"
ON public.app_updates
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Lock down SECURITY DEFINER helpers from anonymous role.
-- They remain callable by authenticated users (needed for RLS checks) and the postgres role.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;