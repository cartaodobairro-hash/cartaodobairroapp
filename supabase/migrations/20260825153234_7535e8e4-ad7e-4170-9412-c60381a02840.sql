
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.owns_customer(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.owns_partner(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.owns_seller(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_customer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_partner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_seller(uuid) TO authenticated;
