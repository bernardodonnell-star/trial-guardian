-- Attaché initial schema. Hosted on Supabase in an EU region (Frankfurt).
-- Row-level security: travellers see only their own rows; reference data is read-only to clients.

create extension if not exists pgcrypto;

-- ---------- Travellers ----------
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  home_country char(2),
  passports char(2)[] not null default '{}', -- nationality only, never passport numbers
  plan text not null default 'free' check (plan in ('free', 'monthly', 'annual', 'super-user')),
  created_at timestamptz not null default now()
);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references public.profiles on delete cascade,
  title text not null,
  passport char(2),
  created_at timestamptz not null default now()
);

create table public.stops (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips on delete cascade,
  city text not null,
  country_code char(2) not null,
  arrive timestamptz not null,
  depart timestamptz not null,
  time_zone text not null,
  lat double precision,
  lon double precision
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  stop_id uuid not null references public.stops on delete cascade,
  kind text not null check (kind in ('flight', 'hotel', 'car', 'rail', 'restaurant', 'meeting', 'other')),
  title text not null,
  start_at timestamptz not null,
  end_at timestamptz,
  place text,
  reference text,
  details jsonb not null default '[]',
  contacts jsonb not null default '[]',
  needs_check text[] not null default '{}',
  lat double precision,
  lon double precision
);

-- ---------- Sources (reference data, maintained by the owner) ----------
create table public.sources (
  id text primary key, -- e.g. 'reuters', 'fcdo', 'ch-police-ge'
  name text not null,
  kind text not null,
  tier smallint not null check (tier between 0 and 3), -- 1 official, 2 data, 3 news, 0 excluded
  country_code char(2),
  feed_url text, -- RSS, Atom or JSON endpoint polled by the scanner
  feed_format text check (feed_format in ('rss', 'atom', 'json')),
  active boolean not null default true,
  reviewed_at date -- news allow-list is reviewed quarterly
);

-- ---------- Events, reports and alerts ----------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  country_code char(2),
  lat double precision,
  lon double precision,
  radius_km real,
  category text, -- armed-conflict, terrorism, crime, unrest, hazard, health, transport
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events on delete cascade,
  source_id text not null references public.sources,
  url text not null unique,
  title text not null,
  published_at timestamptz not null,
  updated_at timestamptz,
  stance text not null default 'reports' check (stance in ('reports', 'confirms', 'denies')),
  syndicated_from text references public.sources,
  fetched_at timestamptz not null default now()
);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips on delete cascade,
  event_id uuid not null references public.events on delete cascade,
  severity text not null check (severity in ('info', 'advisory', 'warning', 'critical')),
  confirmation text not null check (confirmation in ('confirmed', 'denied', 'unconfirmed')),
  why text not null,
  advice text,
  booking_ids uuid[] not null default '{}',
  checker_passed boolean not null default false, -- the separate checker model agreed with the sources
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trip_id, event_id)
);

-- ---------- Assistant usage ----------
create table public.usage (
  owner uuid not null references public.profiles on delete cascade,
  month date not null, -- first day of the month
  used integer not null default 0,
  top_up_remaining integer not null default 0,
  primary key (owner, month)
);

-- ---------- Row-level security ----------
alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.stops enable row level security;
alter table public.bookings enable row level security;
alter table public.alerts enable row level security;
alter table public.usage enable row level security;
alter table public.sources enable row level security;
alter table public.events enable row level security;
alter table public.reports enable row level security;

create policy "own profile" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "own trips" on public.trips for all using (owner = auth.uid()) with check (owner = auth.uid());
create policy "own stops" on public.stops for all
  using (exists (select 1 from public.trips t where t.id = trip_id and t.owner = auth.uid()))
  with check (exists (select 1 from public.trips t where t.id = trip_id and t.owner = auth.uid()));
create policy "own bookings" on public.bookings for all
  using (exists (select 1 from public.stops s join public.trips t on t.id = s.trip_id where s.id = stop_id and t.owner = auth.uid()))
  with check (exists (select 1 from public.stops s join public.trips t on t.id = s.trip_id where s.id = stop_id and t.owner = auth.uid()));
create policy "own alerts" on public.alerts for select
  using (exists (select 1 from public.trips t where t.id = trip_id and t.owner = auth.uid()));
create policy "own usage" on public.usage for select using (owner = auth.uid());

-- Reference data: readable by signed-in users, written only by the service role (Edge Functions).
create policy "read sources" on public.sources for select to authenticated using (true);
create policy "read events" on public.events for select to authenticated using (true);
create policy "read reports" on public.reports for select to authenticated using (true);
