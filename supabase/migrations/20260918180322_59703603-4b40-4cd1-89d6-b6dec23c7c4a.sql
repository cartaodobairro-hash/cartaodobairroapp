ALTER FUNCTION public.claim_seller_proposal(uuid, text) SECURITY INVOKER;
REVOKE ALL ON FUNCTION public.claim_seller_proposal(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_seller_proposal(uuid, text) TO service_role;