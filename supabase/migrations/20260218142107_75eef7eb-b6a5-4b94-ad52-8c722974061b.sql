
-- Fix the "System can insert roles" policy that has WITH CHECK (true) - tighten it
DROP POLICY IF EXISTS "System can insert roles" ON public.user_roles;

-- Only the trigger function (SECURITY DEFINER) handles role insertion, so admins can insert
CREATE POLICY "System can insert roles" ON public.user_roles
  FOR INSERT WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Fix update_updated_at_column function to set search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
