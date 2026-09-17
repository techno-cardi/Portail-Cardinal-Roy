import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-planner-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};

const COURSE_SCHEDULE: Record<number, Record<string, string>> = {
  1:  { p1: "FRA3SE-32", p3: "FRA3SE-31" },
  2:  { p1: "FRA3SE-32", p3: "FRA5SE-51" },
  3:  { p1: "FRA3SE-31", p3: "FRA3SE-32" },
  4:  { p1: "FRA3SE-32", p3: "FRA5SE-51" },
  5:  { p3: "FRA3SE-31" },
  6:  { p1: "FRA5SE-51", p2: "FRA3SE-31", p3: "FRA3SE-32" },
  7:  { p1: "FRA3SE-31", p2: "FRA3SE-32" },
  8:  { p1: "FRA5SE-51", p2: "FRA3SE-31" },
  9:  { p1: "FRA5SE-51", p2: "FRA3SE-31", p3: "FRA3SE-32" },
  10: { p1: "FRA3SE-31", p2: "FRA3SE-32" },
  11: { p1: "FRA3SE-32", p2: "FRA5SE-51", p3: "FRA3SE-31" },
  12: { p1: "FRA3SE-32", p2: "FRA5SE-51" },
  13: { p1: "FRA3SE-31", p2: "FRA5SE-51" },
  14: { p2: "FRA3SE-31" },
  15: { p2: "FRA3SE-32", p3: "FRA5SE-51" },
  16: { p2: "FRA3SE-32", p3: "FRA3SE-31" },
  17: { p3: "FRA5SE-51" },
  18: { p2: "FRA3SE-32", p3: "FRA3SE-31" },
};

const CURSOR_KEY = "google_sync_reconcile_cursor";
const SYNC_KEYS = ["google_sync_url", "google_sync_secret", CURSOR_KEY];
const PERIODS = ["p1", "p2", "p3"];

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function daysBetween(a: string, b: string) {
  return Math.abs((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
}

async function authenticate(db: any, req: Request) {
  const key = req.headers.get("x-planner-key")?.trim() || "";
  if (!key) return false;
  const { data } = await db.from("planner_config")
    .select("config_value")
    .eq("config_key", "access_hash")
    .maybeSingle();
  if (!data?.config_value) return false;
  return await sha256Hex(key) === String(data.config_value);
}

async function loadConfig(db: any) {
  const { data, error } = await db.from("planner_config")
    .select("config_key,config_value")
    .in("config_key", SYNC_KEYS);
  if (error) throw new Error("Configuration Google Agenda indisponible.");
  const map = new Map((data || []).map((row: any) => [String(row.config_key), String(row.config_value || "")]));
  return {
    url: String(map.get("google_sync_url") || "").trim(),
    secret: String(map.get("google_sync_secret") || "").trim(),
    cursor: String(map.get(CURSOR_KEY) || "").trim(),
  };
}

async function saveCursor(db: any, cursor: string) {
  const { error } = await db.from("planner_config").upsert({
    config_key: CURSOR_KEY,
    config_value: cursor,
    updated_at: new Date().toISOString(),
  }, { onConflict: "config_key" });
  if (error) throw new Error("Impossible d’enregistrer l’état de synchronisation Google Agenda.");
}

function courseFor(calendar: any, periodKey: string) {
  if (!calendar || calendar.day_kind !== "school") return "";
  const cycleDay = Number(calendar.cycle_day || 0);
  return COURSE_SCHEDULE[cycleDay]?.[periodKey] || "";
}

async function calendarMapForNotes(db: any, notes: any[]) {
  const dates = [...new Set(notes.map((n: any) => String(n.plan_date || "")).filter(Boolean))];
  if (!dates.length) return new Map<string, any>();
  const { data, error } = await db.from("planner_calendar")
    .select("plan_date,day_kind,cycle_day")
    .in("plan_date", dates);
  if (error) throw new Error("Calendrier scolaire indisponible.");
  return new Map((data || []).map((row: any) => [String(row.plan_date), row]));
}

async function syncOne(cfg: { url: string; secret: string }, note: any, course: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(cfg.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: cfg.secret,
        date: String(note.plan_date),
        period_key: String(note.period_key),
        description: String(note.body || ""),
        course,
      }),
      signal: controller.signal,
    });
    const payload = await res.json().catch(() => ({}));
    const updated = Number(payload?.updated || 0);
    const ok = res.ok && payload?.ok !== false && updated > 0;
    return {
      ok,
      updated,
      reason: String(payload?.message || payload?.reason || (res.ok ? "event_not_updated" : `http_${res.status}`)),
    };
  } catch (err) {
    return {
      ok: false,
      updated: 0,
      reason: err instanceof Error ? err.message : "Erreur Google Agenda",
    };
  } finally {
    clearTimeout(timer);
  }
}

async function syncNotes(db: any, cfg: { url: string; secret: string }, notes: any[]) {
  const calendarMap = await calendarMapForNotes(db, notes);
  const jobs = notes
    .map((note: any) => ({ note, course: courseFor(calendarMap.get(String(note.plan_date)), String(note.period_key)) }))
    .filter((job: any) => Boolean(job.course));

  let updated = 0;
  const skipped = notes.length - jobs.length;
  const failures: any[] = [];

  for (let i = 0; i < jobs.length; i += 4) {
    const batch = jobs.slice(i, i + 4);
    const results = await Promise.all(batch.map((job: any) => syncOne(cfg, job.note, job.course)));
    results.forEach((result, index) => {
      const job = batch[index];
      if (result.ok) updated += result.updated;
      else failures.push({ plan_date: job.note.plan_date, period_key: job.note.period_key, course: job.course, reason: result.reason });
    });
  }

  return { total: notes.length, expected: jobs.length, updated, skipped, failures };
}

async function reconcileRecent(db: any, cfg: { url: string; secret: string; cursor: string }) {
  const startedAt = new Date().toISOString();
  const fallback = new Date(Date.now() - 7 * 86400000).toISOString();
  const since = cfg.cursor || fallback;
  const { data, error } = await db.from("planner_notes")
    .select("plan_date,period_key,body,updated_at")
    .in("period_key", PERIODS)
    .gt("updated_at", since)
    .order("updated_at", { ascending: true })
    .limit(101);
  if (error) throw new Error("Impossible de lire les modifications de planification.");

  const rows = data || [];
  const hasMore = rows.length > 100;
  const notes = rows.slice(0, 100);
  if (!notes.length) {
    await saveCursor(db, startedAt);
    return { ok: true, mode: "recent", since, updated: 0, expected: 0, skipped: 0, failures: [], has_more: false };
  }

  const result = await syncNotes(db, cfg, notes);
  if (!result.failures.length) {
    const cursor = hasMore ? String(notes[notes.length - 1].updated_at) : startedAt;
    await saveCursor(db, cursor);
  }
  return { ok: result.failures.length === 0, mode: "recent", since, ...result, has_more: hasMore };
}

async function backfill(db: any, cfg: { url: string; secret: string }, from: string, to: string) {
  if (!validDate(from) || !validDate(to) || from > to || daysBetween(from, to) > 62) throw new Error("Plage de synchronisation invalide.");
  const { data, error } = await db.from("planner_notes")
    .select("plan_date,period_key,body,updated_at")
    .in("period_key", PERIODS)
    .gte("plan_date", from)
    .lte("plan_date", to)
    .order("plan_date", { ascending: true });
  if (error) throw new Error("Impossible de lire la planification à synchroniser.");
  const result = await syncNotes(db, cfg, data || []);
  return { ok: result.failures.length === 0, mode: "backfill", from, to, ...result };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Méthode non permise." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Configuration serveur incomplète." }, 500);
  const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  if (!(await authenticate(db, req))) return json({ error: "Mot de passe invalide." }, 401);

  let payload: any;
  try { payload = await req.json(); }
  catch { return json({ error: "Corps JSON invalide." }, 400); }

  try {
    const cfg = await loadConfig(db);
    if (!cfg.url || !cfg.secret) return json({ ok: true, enabled: false, updated: 0, failures: [] });
    const action = String(payload?.action || "reconcile_recent");
    if (action === "reconcile_recent") return json({ enabled: true, ...(await reconcileRecent(db, cfg)) });
    if (action === "backfill") return json({ enabled: true, ...(await backfill(db, cfg, String(payload?.from || ""), String(payload?.to || ""))) });
    return json({ error: "Action inconnue." }, 400);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Synchronisation Google Agenda impossible." }, 500);
  }
});
