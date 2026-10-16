-- À exécuter une fois dans Supabase : SQL Editor → New query → coller → Run.

create table if not exists public.publications (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  network text not null check (network in ('Instagram', 'LinkedIn', 'TikTok', 'Facebook', 'X')),
  subject text not null check (char_length(subject) between 1 and 120),
  format text not null default '' check (format in ('', 'Post', 'Story', 'Reel', 'Carrousel', 'Article')),
  status text not null default 'Idée' check (status in ('Idée', 'Rédigé', 'Publié')),
  created_at timestamptz not null default now()
);

create index if not exists publications_date_idx on public.publications (date);

-- Seul le serveur Express accède à la table, avec la clé secrète (sb_secret_…),
-- qui ignore la RLS. On active la RLS sans aucune policy : les clés publiques
-- (publishable / anon) n'ont donc aucun accès direct à la table.
alter table public.publications enable row level security;
