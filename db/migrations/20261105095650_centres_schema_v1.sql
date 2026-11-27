-- Migration 20261105095650 · centres_schema_v1
-- Exported from the Supabase migration history (applied in production).

create table public.centres (
  id text primary key,
  name text not null,
  type text not null check (type in ('University','School','Mairie')),
  region text,
  phase text not null check (phase in ('Phase I','Phase II')),
  status text not null,
  target_basic_ict integer not null default 0,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create table public.centre_coordinators (
  centre_id text not null references public.centres(id) on delete cascade,
  position smallint not null,
  name text not null,
  phone text,
  email text,
  primary key (centre_id, position)
);

create table public.centre_infrastructure (
  centre_id text primary key references public.centres(id) on delete cascade,
  overall_status text,
  renovation_status text,
  renovation_pct integer not null default 0 check (renovation_pct between 0 and 100),
  renovation_notes text,
  rooms jsonb not null default '{}'::jsonb,
  internet_status text,
  internet_bandwidth_mbps integer,
  internet_access_points integer,
  electricity_status text,
  electricity_notes text,
  equipment_status text,
  equipment_pct integer not null default 0 check (equipment_pct between 0 and 100),
  equipment_notes text,
  equipment_items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table public.tot_trainees (
  centre_id text not null references public.centres(id) on delete cascade,
  position smallint not null,
  name text not null,
  in_person_completed boolean,
  lms_completed boolean,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  primary key (centre_id, position)
);

create table public.centre_training_basic (
  centre_id text not null references public.centres(id) on delete cascade,
  year smallint not null,
  enrolled integer not null default 0,
  passed integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  primary key (centre_id, year)
);

create table public.centre_basic_modules (
  centre_id text not null references public.centres(id) on delete cascade,
  module text not null check (module in ('word','excel','ppt','green')),
  passed integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  primary key (centre_id, module)
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('ggg','partner','coordinator')),
  centre_id text references public.centres(id),
  full_name text,
  check (role <> 'coordinator' or centre_id is not null)
);

-- Can the current user edit this centre's data?
create or replace function public.can_edit_centre(c text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and (p.role in ('ggg','partner') or (p.role = 'coordinator' and p.centre_id = c))
  );
$$;

alter table public.centres enable row level security;
alter table public.centre_coordinators enable row level security;
alter table public.centre_infrastructure enable row level security;
alter table public.tot_trainees enable row level security;
alter table public.centre_training_basic enable row level security;
alter table public.centre_basic_modules enable row level security;
alter table public.profiles enable row level security;

-- Dashboard data is readable by everyone (matches the current public site)
create policy "read centres" on public.centres for select using (true);
create policy "read coordinators" on public.centre_coordinators for select using (true);
create policy "read infrastructure" on public.centre_infrastructure for select using (true);
create policy "read tot" on public.tot_trainees for select using (true);
create policy "read training basic" on public.centre_training_basic for select using (true);
create policy "read basic modules" on public.centre_basic_modules for select using (true);

-- Users can read only their own profile row
create policy "read own profile" on public.profiles for select using (user_id = auth.uid());

-- Writes: GGGI / partners edit everything; coordinators edit their own centre only
create policy "write infrastructure" on public.centre_infrastructure for all
  using (public.can_edit_centre(centre_id)) with check (public.can_edit_centre(centre_id));
create policy "write tot" on public.tot_trainees for all
  using (public.can_edit_centre(centre_id)) with check (public.can_edit_centre(centre_id));
create policy "write training basic" on public.centre_training_basic for all
  using (public.can_edit_centre(centre_id)) with check (public.can_edit_centre(centre_id));
create policy "write basic modules" on public.centre_basic_modules for all
  using (public.can_edit_centre(centre_id)) with check (public.can_edit_centre(centre_id));

-- Centre master data and coordinator contacts are maintained by GGGI/partners only
create policy "write centres" on public.centres for all
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('ggg','partner')))
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('ggg','partner')));
create policy "write coordinators" on public.centre_coordinators for all
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('ggg','partner')))
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('ggg','partner')));
