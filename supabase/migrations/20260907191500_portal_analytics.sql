create table if not exists public.portal_analytics_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  event_type text not null check (event_type in ('search','open')),
  query text null check (query is null or char_length(query) <= 80),
  result_count integer null check (result_count is null or (result_count >= 0 and result_count <= 100)),
  resource_id text null check (resource_id is null or char_length(resource_id) <= 120)
);

comment on table public.portal_analytics_events is
  'Analytics anonymes du portail Cardinal-Roy: recherches et ouvertures de ressources, sans identifiant utilisateur.';

alter table public.portal_analytics_events enable row level security;

revoke all on table public.portal_analytics_events from anon, authenticated;
revoke all on sequence public.portal_analytics_events_id_seq from anon, authenticated;

create index if not exists portal_analytics_events_created_at_idx
  on public.portal_analytics_events (created_at desc);
create index if not exists portal_analytics_events_event_type_idx
  on public.portal_analytics_events (event_type, created_at desc);
create index if not exists portal_analytics_events_resource_idx
  on public.portal_analytics_events (resource_id)
  where resource_id is not null;
create index if not exists portal_analytics_events_query_idx
  on public.portal_analytics_events (query)
  where query is not null;
