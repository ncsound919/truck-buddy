-- ============================================================================
-- 0005 — Storage buckets + policies for social media.
-- ============================================================================
-- Convention: every object path is prefixed with the owner's auth uid,
-- i.e. `<uid>/<filename>`, so writes can be authorised with
-- `(storage.foldername(name))[1] = auth.uid()::text`.
--
-- Bucket map (plan §3):
--   avatars          public read, owner write
--   post-media       public read, owner write
--   road-media       public read, owner write
--   group-covers     public read, owner write
--   listing-media    public read, owner write
--   mileage-proofs   private (owner + moderators)
--   reports-evidence private (owner + moderators)
--
-- Idempotent: safe to re-run.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars',         'avatars',         true,  2097152,  array['image/png','image/jpeg','image/webp']),
  ('post-media',      'post-media',      true,  104857600, array['image/png','image/jpeg','image/webp','image/gif','video/mp4','video/quicktime']),
  ('road-media',      'road-media',      true,  10485760, array['image/png','image/jpeg','image/webp','video/mp4']),
  ('group-covers',    'group-covers',    true,  5242880,  array['image/png','image/jpeg','image/webp']),
  ('listing-media',   'listing-media',   true,  10485760, array['image/png','image/jpeg','image/webp']),
  ('mileage-proofs',  'mileage-proofs',  false, 10485760, array['image/png','image/jpeg','image/webp','application/pdf']),
  ('reports-evidence','reports-evidence', false, 10485760, array['image/png','image/jpeg','image/webp','application/pdf'])
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
declare
  b text;
  public_buckets text[] := array['avatars', 'post-media', 'road-media', 'group-covers', 'listing-media'];
  private_buckets text[] := array['mileage-proofs', 'reports-evidence'];
begin
  foreach b in array public_buckets loop
    begin
      execute format(
        'create policy %I on storage.objects for select to authenticated using (bucket_id = %L)',
        b || ': read', b);
    exception when duplicate_object then null; end;

    begin
      execute format(
        'create policy %I on storage.objects for insert to authenticated with check (bucket_id = %L and (storage.foldername(name))[1] = auth.uid()::text)',
        b || ': owner upload', b);
    exception when duplicate_object then null; end;

    begin
      execute format(
        'create policy %I on storage.objects for update to authenticated using (bucket_id = %L and (storage.foldername(name))[1] = auth.uid()::text)',
        b || ': owner update', b);
    exception when duplicate_object then null; end;

    begin
      execute format(
        'create policy %I on storage.objects for delete to authenticated using (bucket_id = %L and (storage.foldername(name))[1] = auth.uid()::text)',
        b || ': owner delete', b);
    exception when duplicate_object then null; end;
  end loop;

  foreach b in array private_buckets loop
    begin
      execute format(
        'create policy %I on storage.objects for select to authenticated using (bucket_id = %L and ((storage.foldername(name))[1] = auth.uid()::text or public.is_moderator()))',
        b || ': read', b);
    exception when duplicate_object then null; end;

    begin
      execute format(
        'create policy %I on storage.objects for insert to authenticated with check (bucket_id = %L and (storage.foldername(name))[1] = auth.uid()::text)',
        b || ': owner upload', b);
    exception when duplicate_object then null; end;

    begin
      execute format(
        'create policy %I on storage.objects for delete to authenticated using (bucket_id = %L and (storage.foldername(name))[1] = auth.uid()::text or public.is_moderator())',
        b || ': delete', b);
    exception when duplicate_object then null; end;
  end loop;
end $$;
