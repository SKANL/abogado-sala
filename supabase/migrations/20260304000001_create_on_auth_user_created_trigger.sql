-- Creates the trigger that was missing from auth.users.
-- The function handle_new_user already existed but the trigger that calls it
-- was never installed, so new registrations via invitation never had their
-- profile created or app_metadata populated with org_id + role.
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();
