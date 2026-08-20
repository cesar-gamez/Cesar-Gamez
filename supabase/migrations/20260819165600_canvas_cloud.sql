create table if not exists public.canvas_scenes (
  id text primary key,
  document jsonb not null,
  updated_at timestamptz not null default now()
);

comment on table public.canvas_scenes is
  'Single portfolio canvas document in world space so any screen can reconstruct the same view.';

alter table public.canvas_scenes enable row level security;

drop policy if exists canvas_scenes_public_read on public.canvas_scenes;
create policy canvas_scenes_public_read
  on public.canvas_scenes
  for select
  to anon, authenticated
  using (true);

insert into storage.buckets (id, name, public, file_size_limit)
values ('canvas-media', 'canvas-media', true, 104857600)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

drop policy if exists canvas_media_public_read on storage.objects;
create policy canvas_media_public_read
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'canvas-media');
