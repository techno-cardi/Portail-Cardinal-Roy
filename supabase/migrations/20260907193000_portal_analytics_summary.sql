create or replace function public.portal_analytics_summary(p_days integer default 30)
returns jsonb
language sql
security definer
set search_path = public
as $$
with params as (
  select greatest(1, least(coalesce(p_days, 30), 3650))::integer as days
), filtered as (
  select e.*
  from public.portal_analytics_events e, params p
  where e.created_at >= now() - make_interval(days => p.days)
), totals as (
  select
    count(*) filter (where event_type = 'search')::bigint as searches,
    count(*) filter (where event_type = 'search' and coalesce(result_count, 0) = 0)::bigint as no_results,
    count(*) filter (where event_type = 'open')::bigint as opens,
    count(distinct resource_id) filter (where event_type = 'open' and resource_id is not null)::bigint as resources_opened
  from filtered
), top_searches as (
  select
    query,
    count(*)::bigint as count,
    (array_agg(result_count order by created_at desc))[1] as last_result_count
  from filtered
  where event_type = 'search'
    and query is not null
    and query <> '[requete privee]'
  group by query
  order by count(*) desc, max(created_at) desc
  limit 20
), no_result_searches as (
  select
    query,
    count(*)::bigint as count
  from filtered
  where event_type = 'search'
    and coalesce(result_count, 0) = 0
    and query is not null
    and query <> '[requete privee]'
  group by query
  order by count(*) desc, max(created_at) desc
  limit 20
), top_opens as (
  select
    resource_id,
    count(*)::bigint as count
  from filtered
  where event_type = 'open'
    and resource_id is not null
  group by resource_id
  order by count(*) desc, max(created_at) desc
  limit 20
)
select jsonb_build_object(
  'days', (select days from params),
  'generatedAt', now(),
  'totals', jsonb_build_object(
    'searches', coalesce((select searches from totals), 0),
    'noResults', coalesce((select no_results from totals), 0),
    'opens', coalesce((select opens from totals), 0),
    'resourcesOpened', coalesce((select resources_opened from totals), 0)
  ),
  'topSearches', coalesce((
    select jsonb_agg(jsonb_build_object(
      'query', query,
      'count', count,
      'lastResultCount', last_result_count
    ) order by count desc, query)
    from top_searches
  ), '[]'::jsonb),
  'noResults', coalesce((
    select jsonb_agg(jsonb_build_object(
      'query', query,
      'count', count
    ) order by count desc, query)
    from no_result_searches
  ), '[]'::jsonb),
  'topOpens', coalesce((
    select jsonb_agg(jsonb_build_object(
      'resourceId', resource_id,
      'count', count
    ) order by count desc, resource_id)
    from top_opens
  ), '[]'::jsonb)
);
$$;

comment on function public.portal_analytics_summary(integer) is
  'Retourne uniquement des statistiques agrégées et anonymes du portail Cardinal-Roy.';

revoke all on function public.portal_analytics_summary(integer) from public, anon, authenticated;
grant execute on function public.portal_analytics_summary(integer) to service_role;
