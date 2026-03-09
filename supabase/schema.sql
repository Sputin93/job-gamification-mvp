-- Enable pgcrypto for UUID generation
create extension if not exists "pgcrypto";

-- Profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null unique,
  full_name text,
  role text,
  onboarding_step text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by owners" on public.profiles
  for select using (auth.uid() = id);

create policy "Profiles are editable by owners" on public.profiles
  for update using (auth.uid() = id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_profile_update
before update on public.profiles
for each row execute procedure public.set_updated_at();

-- Questionnaire responses
create table if not exists public.questionnaire_responses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  step text not null,
  responses jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, step)
);

alter table public.questionnaire_responses enable row level security;

create policy "Questionnaire readable by owners" on public.questionnaire_responses
  for select using (auth.uid() = profile_id);

create policy "Questionnaire upsert by owners" on public.questionnaire_responses
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create trigger on_questionnaire_update
before update on public.questionnaire_responses
for each row execute procedure public.set_updated_at();

-- Job listings
create table if not exists public.job_listings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  company text not null,
  tags text[] default array[]::text[],
  seniority text,
  employment_type text,
  location text,
  created_at timestamptz not null default now()
);

alter table public.job_listings enable row level security;

create policy "Job listings accessible to authenticated" on public.job_listings
  for select using (auth.role() = 'authenticated');

-- Job applications
create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  job_listing_id uuid not null references public.job_listings(id) on delete cascade,
  status text not null default 'draft',
  match_score numeric,
  created_at timestamptz not null default now()
);

alter table public.job_applications enable row level security;

create policy "Applications readable by owners" on public.job_applications
  for select using (auth.uid() = profile_id);

create policy "Applications insert by owners" on public.job_applications
  for insert with check (auth.uid() = profile_id);

create policy "Applications update by owners" on public.job_applications
  for update using (auth.uid() = profile_id);

-- RPC for job matching (wrapper around edge function)
create or replace function public.job_match(p_profile_id uuid)
returns table (
  job_id uuid,
  title text,
  company text,
  seniority text,
  employment_type text,
  match_score numeric
) security definer set search_path = public as $$
declare
  v_core_skills text := '';
  v_desired_seniority text := null;
  v_work_mode text := null;
begin
  select coalesce(responses->>'core_skills', '')
    into v_core_skills
  from public.questionnaire_responses
  where profile_id = p_profile_id and step = 'competenze'
  limit 1;

  select responses->>'desired_seniority', responses->>'work_mode'
    into v_desired_seniority, v_work_mode
  from public.questionnaire_responses
  where profile_id = p_profile_id and step = 'preferenze'
  limit 1;

  return query
  select
    j.id as job_id,
    j.title,
    j.company,
    j.seniority,
    j.employment_type,
    round((
      coalesce(
        case
          when v_core_skills = '' then 0.3
          when j.tags is null then 0.5
          when exists (
            select 1 from unnest(j.tags) tag where lower(v_core_skills) like '%' || lower(tag) || '%'
          ) then 1
          else 0.6
        end,
        0.4
      ) + coalesce(
        case
          when v_desired_seniority is null then 0.4
          when v_desired_seniority = j.seniority then 1
          else 0.6
        end,
        0.4
      ) + coalesce(
        case
          when v_work_mode is null then 0.4
          when lower(v_work_mode) = lower(coalesce(j.employment_type, '')) then 1
          else 0.6
        end,
        0.4
      )
    ) / 3, 2) as match_score
  from public.job_listings j
  order by match_score desc;
end;
$$ language plpgsql;

grant execute on function public.job_match(uuid) to authenticated;