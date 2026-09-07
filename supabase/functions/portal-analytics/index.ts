const ALLOWED_ORIGINS = new Set([
  'https://techno-cardi.github.io'
]);

const isLocalOrigin = (origin: string) =>
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);

const corsHeaders = (origin: string) => ({
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) || isLocalOrigin(origin) ? origin : 'https://techno-cardi.github.io',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Cache-Control': 'no-store',
  'Vary': 'Origin'
});

const normalizeQuery = (value: unknown) => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (/@/.test(raw) || /(?:\d[ .()-]*){7,}/.test(raw)) return '[requete privee]';
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9+ -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 64);
};

const getSecretKey = () => {
  const modern = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (modern) {
    try {
      const parsed = JSON.parse(modern);
      if (parsed?.default) return parsed.default;
    } catch {
      // Fallback legacy ci-dessous.
    }
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
};

const isAllowedOrigin = (origin: string) =>
  !origin || ALLOWED_ORIGINS.has(origin) || isLocalOrigin(origin);

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') || '';
  const headers = corsHeaders(origin);

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (!isAllowedOrigin(origin)) {
    return Response.json({ error: 'origin_not_allowed' }, { status: 403, headers });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const secretKey = getSecretKey();
  if (!supabaseUrl || !secretKey) {
    console.error('Supabase environment is incomplete');
    return Response.json({ error: 'backend_not_configured' }, { status: 500, headers });
  }

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const requestedDays = Number(url.searchParams.get('days') || 30);
    const days = Number.isFinite(requestedDays)
      ? Math.max(1, Math.min(365, Math.trunc(requestedDays)))
      : 30;

    const summary = await fetch(`${supabaseUrl}/rest/v1/rpc/portal_analytics_summary`, {
      method: 'POST',
      headers: {
        'apikey': secretKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ p_days: days })
    });

    if (!summary.ok) {
      console.error('Analytics summary failed', summary.status, await summary.text());
      return Response.json({ error: 'summary_failed' }, { status: 502, headers });
    }

    const data = await summary.json();
    return Response.json(data, { status: 200, headers });
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'method_not_allowed' }, { status: 405, headers });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400, headers });
  }

  const eventType = body.type === 'search' || body.type === 'open' ? body.type : '';
  if (!eventType) return Response.json({ error: 'invalid_event_type' }, { status: 400, headers });

  const row: Record<string, unknown> = {
    event_type: eventType,
    query: null,
    result_count: null,
    resource_id: null
  };

  if (eventType === 'search') {
    const query = normalizeQuery(body.query);
    if (query.length < 2) return new Response(null, { status: 204, headers });
    row.query = query;
    const count = Number(body.resultCount);
    row.result_count = Number.isFinite(count) ? Math.max(0, Math.min(100, Math.trunc(count))) : 0;
  } else {
    const resourceId = String(body.resourceId ?? '').trim().slice(0, 120);
    if (!/^[a-z0-9][a-z0-9-]{0,119}$/i.test(resourceId)) {
      return Response.json({ error: 'invalid_resource_id' }, { status: 400, headers });
    }
    row.resource_id = resourceId;
  }

  const insert = await fetch(`${supabaseUrl}/rest/v1/portal_analytics_events`, {
    method: 'POST',
    headers: {
      'apikey': secretKey,
      'content-type': 'application/json',
      'prefer': 'return=minimal'
    },
    body: JSON.stringify(row)
  });

  if (!insert.ok) {
    console.error('Analytics insert failed', insert.status, await insert.text());
    return Response.json({ error: 'insert_failed' }, { status: 502, headers });
  }

  return new Response(null, { status: 202, headers });
});
