create extension if not exists "pgcrypto";

create table public.surveys (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) >= 3),
  description text not null default '',
  category text,
  deadline timestamptz,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys (id) on delete cascade,
  sort_order integer not null check (sort_order >= 1),
  prompt text not null check (char_length(trim(prompt)) > 0),
  allow_multiple boolean not null default false,
  created_at timestamptz not null default now(),
  unique (survey_id, sort_order)
);

create table public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  sort_order integer not null check (sort_order >= 1),
  label text not null check (char_length(trim(label)) > 0),
  created_at timestamptz not null default now(),
  unique (question_id, sort_order)
);

create table public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  option_id uuid not null references public.question_options (id) on delete cascade,
  voter_token text not null check (char_length(trim(voter_token)) >= 8),
  created_at timestamptz not null default now(),
  unique (question_id, option_id, voter_token)
);

create index surveys_status_deadline_idx on public.surveys (status, deadline);
create index surveys_created_at_idx on public.surveys (created_at desc);
create index questions_survey_id_sort_order_idx on public.questions (survey_id, sort_order);
create index question_options_question_id_sort_order_idx
  on public.question_options (question_id, sort_order);
create index survey_responses_survey_id_idx on public.survey_responses (survey_id);
create index survey_responses_question_id_idx on public.survey_responses (question_id);

create or replace view public.question_result_stats
with (security_invoker = true)
as
select
  q.survey_id,
  q.id as question_id,
  q.sort_order as question_sort_order,
  q.prompt as question_prompt,
  q.allow_multiple,
  o.id as option_id,
  o.sort_order as option_sort_order,
  o.label as option_label,
  count(r.id)::integer as vote_count
from public.questions q
join public.question_options o on o.question_id = q.id
left join public.survey_responses r on r.option_id = o.id
group by
  q.survey_id,
  q.id,
  q.sort_order,
  q.prompt,
  q.allow_multiple,
  o.id,
  o.sort_order,
  o.label;

create or replace function public.cast_survey_vote(
  p_survey_id uuid,
  p_question_id uuid,
  p_option_id uuid,
  p_voter_token text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allow_multiple boolean;
begin
  if char_length(trim(p_voter_token)) < 8 then
    raise exception 'invalid voter_token';
  end if;

  select q.allow_multiple
  into v_allow_multiple
  from public.questions q
  where q.id = p_question_id
    and q.survey_id = p_survey_id;

  if not found then
    raise exception 'question not found';
  end if;

  if not exists (
    select 1
    from public.question_options o
    where o.id = p_option_id
      and o.question_id = p_question_id
  ) then
    raise exception 'option not found';
  end if;

  if not v_allow_multiple then
    delete from public.survey_responses
    where question_id = p_question_id
      and voter_token = p_voter_token;
  end if;

  insert into public.survey_responses (
    survey_id,
    question_id,
    option_id,
    voter_token
  )
  values (
    p_survey_id,
    p_question_id,
    p_option_id,
    p_voter_token
  )
  on conflict (question_id, option_id, voter_token) do nothing;
end;
$$;

create or replace function public.retract_survey_vote(
  p_question_id uuid,
  p_option_id uuid,
  p_voter_token text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.survey_responses
  where question_id = p_question_id
    and option_id = p_option_id
    and voter_token = p_voter_token;
end;
$$;

revoke all on function public.cast_survey_vote(uuid, uuid, uuid, text) from public;
revoke all on function public.retract_survey_vote(uuid, uuid, text) from public;
grant execute on function public.cast_survey_vote(uuid, uuid, uuid, text) to anon, authenticated;
grant execute on function public.retract_survey_vote(uuid, uuid, text) to anon, authenticated;

alter table public.surveys enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.survey_responses enable row level security;

create policy surveys_select_anon
  on public.surveys
  for select
  to anon, authenticated
  using (true);

create policy surveys_insert_anon
  on public.surveys
  for insert
  to anon, authenticated
  with check (true);

create policy surveys_update_anon
  on public.surveys
  for update
  to anon, authenticated
  using (true)
  with check (true);

create policy questions_select_anon
  on public.questions
  for select
  to anon, authenticated
  using (true);

create policy questions_insert_anon
  on public.questions
  for insert
  to anon, authenticated
  with check (true);

create policy question_options_select_anon
  on public.question_options
  for select
  to anon, authenticated
  using (true);

create policy question_options_insert_anon
  on public.question_options
  for insert
  to anon, authenticated
  with check (true);

create policy survey_responses_select_anon
  on public.survey_responses
  for select
  to anon, authenticated
  using (true);

create policy survey_responses_insert_anon
  on public.survey_responses
  for insert
  to anon, authenticated
  with check (false);

alter table public.survey_responses replica identity full;

alter publication supabase_realtime add table public.survey_responses;

grant select on public.question_result_stats to anon, authenticated;
