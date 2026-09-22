alter table public.portal_analytics_events
  add column if not exists visitor_id uuid null;

create index if not exists portal_analytics_events_visitor_idx
  on public.portal_analytics_events (visitor_id, created_at desc)
  where visitor_id is not null;

comment on column public.portal_analytics_events.visitor_id is
  'Identifiant navigateur aléatoire anonyme généré côté client. Aucune IP ni identité utilisateur.';

create or replace function public.portal_analytics_summary(p_days integer default 30)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
with params as (
  select greatest(1, least(365, coalesce(p_days, 30)))::integer as days
),
bounds as (
  select
    (date_trunc('day', now() at time zone 'America/Toronto') at time zone 'America/Toronto') as local_day_start
),
windowed as (
  select e.*
  from public.portal_analytics_events e, params p
  where e.created_at >= now() - make_interval(days => p.days)
),
top_opens as (
  select resource_id, count(*)::integer as count
  from windowed
  where event_type = 'open' and resource_id is not null
  group by resource_id
  order by count(*) desc, resource_id asc
  limit 20
),
period_totals as (
  select
    count(*) filter (where event_type = 'visit' and created_at >= b.local_day_start)::integer as visits_today,
    count(*) filter (where event_type = 'visit' and created_at >= now() - interval '7 days')::integer as visits_7_days,
    count(*) filter (where event_type = 'visit' and created_at >= now() - interval '30 days')::integer as visits_30_days,
    count(distinct visitor_id) filter (where event_type = 'visit' and visitor_id is not null and created_at >= b.local_day_start)::integer as unique_visitors_today,
    count(distinct visitor_id) filter (where event_type = 'visit' and visitor_id is not null and created_at >= now() - interval '7 days')::integer as unique_visitors_7_days,
    count(distinct visitor_id) filter (where event_type = 'visit' and visitor_id is not null and created_at >= now() - interval '30 days')::integer as unique_visitors_30_days,
    count(*) filter (where event_type = 'open' and created_at >= b.local_day_start)::integer as opens_today,
    count(*) filter (where event_type = 'open' and created_at >= now() - interval '7 days')::integer as opens_7_days,
    count(*) filter (where event_type = 'open' and created_at >= now() - interval '30 days')::integer as opens_30_days,
    count(*) filter (where event_type = 'search' and created_at >= b.local_day_start)::integer as searches_today,
    count(*) filter (where event_type = 'search' and created_at >= now() - interval '7 days')::integer as searches_7_days,
    count(*) filter (where event_type = 'search' and created_at >= now() - interval '30 days')::integer as searches_30_days
  from public.portal_analytics_events, bounds b
),
latest as (
  select max(created_at) as last_event_at
  from public.portal_analytics_events
),
unique_tracking as (
  select min(created_at) as started_at
  from public.portal_analytics_events
  where visitor_id is not null
)
select jsonb_build_object(
  'days', (select days from params),
  'timezone', 'America/Toronto',
  'generatedAt', now(),
  'lastEventAt', (select last_event_at from latest),
  'uniqueTrackingSince', (select started_at from unique_tracking),
  'totals', jsonb_build_object(
    'visits', count(*) filter (where event_type = 'visit'),
    'searches', count(*) filter (where event_type = 'search'),
    'noResults', count(*) filter (where event_type = 'search' and coalesce(result_count, 0) = 0),
    'opens', count(*) filter (where event_type = 'open'),
    'resourcesOpened', count(distinct resource_id) filter (where event_type = 'open' and resource_id is not null)
  ),
  'periods', jsonb_build_object(
    'visitsToday', (select visits_today from period_totals),
    'visits7Days', (select visits_7_days from period_totals),
    'visits30Days', (select visits_30_days from period_totals),
    'uniqueVisitorsToday', (select unique_visitors_today from period_totals),
    'uniqueVisitors7Days', (select unique_visitors_7_days from period_totals),
    'uniqueVisitors30Days', (select unique_visitors_30_days from period_totals),
    'opensToday', (select opens_today from period_totals),
    'opens7Days', (select opens_7_days from period_totals),
    'opens30Days', (select opens_30_days from period_totals),
    'searchesToday', (select searches_today from period_totals),
    'searches7Days', (select searches_7_days from period_totals),
    'searches30Days', (select searches_30_days from period_totals)
  ),
  'topOpens', coalesce((select jsonb_agg(jsonb_build_object(
    'resourceId', resource_id,
    'count', count
  )) from top_opens), '[]'::jsonb)
)
from windowed;
$$;

revoke all on function public.portal_analytics_summary(integer) from public, anon, authenticated;
grant execute on function public.portal_analytics_summary(integer) to service_role;

comment on function public.portal_analytics_summary(integer) is
  'Résumé agrégé du portail. Journée locale America/Toronto et visiteurs uniques anonymes par identifiant navigateur.';
