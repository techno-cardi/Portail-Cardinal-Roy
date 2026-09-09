create or replace function public.portal_analytics_summary(p_days integer default 30)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
with params as (
  select greatest(1, least(365, coalesce(p_days, 30)))::integer as days
),
windowed as (
  select e.*
  from public.portal_analytics_events e, params p
  where e.created_at >= now() - make_interval(days => p.days)
),
top_searches as (
  select
    query,
    count(*)::integer as count,
    (array_agg(result_count order by created_at desc))[1] as last_result_count
  from windowed
  where event_type = 'search' and query is not null
  group by query
  order by count(*) desc, query asc
  limit 15
),
no_results as (
  select query, count(*)::integer as count
  from windowed
  where event_type = 'search' and query is not null and coalesce(result_count, 0) = 0
  group by query
  order by count(*) desc, query asc
  limit 15
),
top_opens as (
  select resource_id, count(*)::integer as count
  from windowed
  where event_type = 'open' and resource_id is not null
  group by resource_id
  order by count(*) desc, resource_id asc
  limit 15
),
period_totals as (
  select
    count(*) filter (where event_type = 'open' and created_at >= current_date)::integer as opens_today,
    count(*) filter (where event_type = 'open' and created_at >= now() - interval '7 days')::integer as opens_7_days,
    count(*) filter (where event_type = 'open' and created_at >= now() - interval '30 days')::integer as opens_30_days,
    count(*) filter (where event_type = 'search' and created_at >= current_date)::integer as searches_today,
    count(*) filter (where event_type = 'search' and created_at >= now() - interval '7 days')::integer as searches_7_days,
    count(*) filter (where event_type = 'search' and created_at >= now() - interval '30 days')::integer as searches_30_days
  from public.portal_analytics_events
),
latest as (
  select max(created_at) as last_event_at
  from public.portal_analytics_events
)
select jsonb_build_object(
  'days', (select days from params),
  'generatedAt', now(),
  'lastEventAt', (select last_event_at from latest),
  'totals', jsonb_build_object(
    'searches', count(*) filter (where event_type = 'search'),
    'noResults', count(*) filter (where event_type = 'search' and coalesce(result_count, 0) = 0),
    'opens', count(*) filter (where event_type = 'open'),
    'resourcesOpened', count(distinct resource_id) filter (where event_type = 'open' and resource_id is not null)
  ),
  'periods', jsonb_build_object(
    'opensToday', (select opens_today from period_totals),
    'opens7Days', (select opens_7_days from period_totals),
    'opens30Days', (select opens_30_days from period_totals),
    'searchesToday', (select searches_today from period_totals),
    'searches7Days', (select searches_7_days from period_totals),
    'searches30Days', (select searches_30_days from period_totals)
  ),
  'topSearches', coalesce((select jsonb_agg(jsonb_build_object(
    'query', query,
    'count', count,
    'lastResultCount', last_result_count
  )) from top_searches), '[]'::jsonb),
  'noResults', coalesce((select jsonb_agg(jsonb_build_object(
    'query', query,
    'count', count
  )) from no_results), '[]'::jsonb),
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
  'Résumé agrégé des analytics anonymes du portail Cardinal-Roy pour le tableau admin.';
