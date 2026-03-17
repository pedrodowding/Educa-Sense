-- Ensure child_activity_progress table exists (idempotent check)
create table if not exists child_activity_progress (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  activity_id uuid not null,
  subject text not null,
  completed boolean default false,
  score numeric default 0,
  max_score numeric default 100,
  accuracy numeric generated always as (
    case
      when max_score > 0 then (score / max_score)
      else 0
    end
  ) stored,
  xp_earned integer default 0,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

create index if not exists idx_child_progress_child_id
on child_activity_progress(child_id);

create index if not exists idx_child_progress_completed_at
on child_activity_progress(completed_at);

-- Create RPC for progress summary
create or replace function get_child_progress_summary(p_child_id uuid)
returns json
language plpgsql
security definer
as $$
declare
  result json;
begin

select json_build_object(
  'total_activities',
  count(*),

  'completed_activities',
  count(*) filter (where completed = true),

  'completion_rate',
  case
    when count(*) > 0
    then round((count(*) filter (where completed = true)::numeric / count(*)) * 100, 2)
    else 0
  end,

  'average_accuracy',
  coalesce(round(avg(accuracy) * 100, 2), 0),

  'total_xp',
  coalesce(sum(xp_earned), 0),

  'streak_days',
  (
    select count(distinct completed_at::date)
    from child_activity_progress
    where child_id = p_child_id
    and completed = true
    and completed_at > now() - interval '7 days'
  )
)
into result
from child_activity_progress
where child_id = p_child_id;

return result;

end;
$$;

-- Create RPC for progress by subject
create or replace function get_child_progress_by_subject(p_child_id uuid)
returns table (
  subject text,
  completion_rate numeric,
  average_accuracy numeric,
  total_xp bigint
)
language sql
security definer
as $$
select
  subject,
  case
    when count(*) > 0
    then round((count(*) filter (where completed = true)::numeric / count(*)) * 100, 2)
    else 0
  end as completion_rate,
  coalesce(round(avg(accuracy) * 100, 2), 0) as average_accuracy,
  coalesce(sum(xp_earned), 0) as total_xp
from child_activity_progress
where child_id = p_child_id
group by subject;
$$;
