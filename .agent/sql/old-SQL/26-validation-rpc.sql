-- Create a secure RPC function to get public case validation info
-- Accesses cases, clients, and organizations bypassing RLS (SECURITY DEFINER)
-- Only exposes strictly necessary fields

CREATE OR REPLACE FUNCTION public.get_case_validation(p_token text)
RETURNS TABLE (
  found boolean,
  org_name text,
  org_logo_url text,
  client_name text,
  case_status text,
  case_created_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    true as found,
    o.name as org_name,
    o.logo_url as org_logo_url,
    c.full_name as client_name,
    cse.status::text as case_status, -- Cast enum to text
    cse.created_at as case_created_at
  FROM cases cse
  JOIN organizations o ON o.id = cse.org_id
  JOIN clients c ON c.id = cse.client_id
  WHERE cse.token = p_token;
END;
$$;

-- Grant execute permission to anon (public) users
GRANT EXECUTE ON FUNCTION public.get_case_validation(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_case_validation(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_case_validation(text) TO service_role;
