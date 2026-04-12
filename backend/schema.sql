create table if not exists public.app_users (
  id text primary key,
  username text,
  first_name text,
  last_name text,
  credits integer not null default 100,
  enhance_credits integer not null default 50,
  created_at timestamptz not null default now()
);

create table if not exists public.generations (
  id bigint generated always as identity primary key,
  user_id text not null references public.app_users(id) on delete cascade,
  type text not null,
  model text,
  prompt text,
  cost integer not null default 0,
  result_url text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists generations_user_id_created_at_idx
on public.generations (user_id, created_at desc);
