-- À exécuter dans Supabase : SQL Editor → New query → coller → Run.
-- Le script peut être relancé sans risque (il met à jour une base existante).

create table if not exists public.publications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  network text not null check (network in ('Instagram', 'LinkedIn', 'TikTok', 'Facebook', 'X')),
  subject text not null check (char_length(subject) between 1 and 120),
  format text not null default '' check (format in ('', 'Post', 'Story', 'Reel', 'Carrousel', 'Article')),
  status text not null default 'Idée' check (status in ('Idée', 'Rédigé', 'Publié')),
  created_at timestamptz not null default now()
);

-- Base créée avec une version précédente de ce script : ajout du propriétaire.
-- Les anciennes lignes sans propriétaire deviennent invisibles ; on peut les
-- supprimer avec : delete from public.publications where user_id is null;
alter table public.publications
  add column if not exists user_id uuid default auth.uid() references auth.users (id) on delete cascade;

create index if not exists publications_user_date_idx on public.publications (user_id, date);
drop index if exists public.publications_date_idx;

-- Seuls les utilisateurs connectés ont accès à la table, et uniquement à leurs
-- propres lignes (Row Level Security).
alter table public.publications enable row level security;

revoke all on public.publications from anon;
grant select, insert, update, delete on public.publications to authenticated;

drop policy if exists "Accès public aux publications" on public.publications;
drop policy if exists "Lire ses publications" on public.publications;
drop policy if exists "Ajouter ses publications" on public.publications;
drop policy if exists "Modifier ses publications" on public.publications;
drop policy if exists "Supprimer ses publications" on public.publications;

create policy "Lire ses publications"
  on public.publications for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Ajouter ses publications"
  on public.publications for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Modifier ses publications"
  on public.publications for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Supprimer ses publications"
  on public.publications for delete to authenticated
  using ((select auth.uid()) = user_id);
