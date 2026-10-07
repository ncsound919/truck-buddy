-- Social privacy hardening (W7a).
--   * member_locations: sharing is opt-in (default OFF); the app also
--     quantizes coordinates and deletes the row on opt-out.
--   * road_reports: anonymous reads respect expires_at.
--   * a purge function removes stale rows, scheduled with pg_cron when the
--     extension is available (guarded; schedule manually otherwise).

-- Opt-in by default.
alter table public.member_locations alter column is_sharing set default false;

-- Anonymous reads of road reports must honor expiry.
drop policy if exists "Anon reads active road reports" on public.road_reports;
create policy "Anon reads active road reports"
  on public.road_reports for select to anon
  using (is_removed = false and (expires_at is null or expires_at > now()));

-- Retention: prune stale member locations and long-expired reports.
create schema if not exists private;

create or replace function private.purge_stale_social()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.member_locations where updated_at < now() - interval '7 days';
  delete from public.road_reports
    where expires_at is not null and expires_at < now() - interval '30 days';
$$;

revoke execute on function private.purge_stale_social() from public;

-- Schedule daily at 03:17 when pg_cron is enabled; otherwise this is a no-op
-- and the purge must be scheduled (dashboard Cron or an external trigger).
do $$
begin
  begin
    execute 'create extension if not exists pg_cron';
    perform cron.schedule(
      'purge_stale_social',
      '17 3 * * *',
      $cron$select private.purge_stale_social()$cron$
    );
  exception when others then
    raise notice 'pg_cron unavailable (%); schedule private.purge_stale_social() manually.', sqlerrm;
  end;
end $$;
