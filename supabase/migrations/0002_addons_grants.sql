-- Newer Supabase projects don't grant API roles access to tables created in SQL.
-- RLS still decides which rows each role sees; these grants let the roles reach the table at all.
grant select on table public.addons to anon, authenticated;
grant select, insert, update, delete on table public.addons to service_role;
