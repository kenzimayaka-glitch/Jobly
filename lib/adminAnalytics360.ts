import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";

export const ANALYTICS_TIME_ZONE = "Africa/Douala";
export const ANALYTICS_METRICS = [
  { key: "users", label: "Talents & utilisateurs", table: "User", module: "Talent" },
  { key: "jobs", label: "Offres agrégées", table: "Job", module: "Africa Opportunities" },
  { key: "recruiter_jobs", label: "Offres recruteurs", table: "RecruiterJob", module: "Recruitment 360" },
  { key: "applications", label: "Candidatures", table: "Application", module: "Recruitment 360" },
  { key: "companies", label: "Entreprises", table: "Company", module: "Recruitment 360" },
  { key: "partners", label: "Partenaires", table: "Partner", module: "Partners" },
  { key: "events", label: "Événements", table: "Event", module: "Events" },
  { key: "subscriptions", label: "Abonnements", table: "Subscription", module: "Finance" },
  { key: "payments", label: "Transactions", table: "Payment", module: "Finance" },
  { key: "communities", label: "Communautés", table: "Community", module: "Community" },
  { key: "community_posts", label: "Publications", table: "CommunityPost", module: "Community" },
  { key: "community_members", label: "Membres Community", table: "CommunityMembership", module: "Community" },
  { key: "mobility_requests", label: "Demandes Mobility", table: "MobilityRequest", module: "Mobility" },
  { key: "job_sources", label: "Sources d'offres", table: "JobSource", module: "Africa Opportunities" },
  { key: "harvest_captures", label: "Captures d'offres", table: "JobHarvestCapture", module: "Africa Opportunities" },
  { key: "audit_events", label: "Événements d'audit", table: "AuditLog", module: "Tech & Security" },
] as const;

export type AnalyticsPeriod = "7d" | "30d" | "90d" | "365d" | "custom";
export type AnalyticsGroup = "day" | "week" | "month" | "quarter" | "year";

export class AdminAnalyticsAccessError extends Error {
  status: number;
  constructor(message: string, status = 403) { super(message); this.status = status; }
}

export async function requireAdminAnalytics(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) throw new AdminAnalyticsAccessError("Session requise.", 401);
  const db = adminClient();
  const user = await ensureUser(db, auth);
  if (String(user.role).toUpperCase() !== "ADMIN") {
    throw new AdminAnalyticsAccessError("Espace ADMIN requis.", 403);
  }
  const { data: identity, error } = await db.from("AdminIdentity").select("active")
    .eq("authUserId", auth.id).eq("ownerUserId", user.id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!identity?.active) throw new AdminAnalyticsAccessError("Identité ADMIN maître inactive.", 403);
  return { db, auth, user };
}

export function analyticsError(error: unknown) {
  if (error instanceof AdminAnalyticsAccessError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }
  return NextResponse.json({ message: error instanceof Error ? error.message : "Analyse indisponible." }, { status: 500 });
}

export function doualaToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ANALYTICS_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value || "01";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function addDays(value: string, amount: number) {
  const date = new Date(value + "T12:00:00.000Z");
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
function dayDiff(start: string, end: string) {
  return Math.max(1, Math.round((Date.parse(end + "T00:00:00Z") - Date.parse(start + "T00:00:00Z")) / 86400000) + 1);
}
function validDate(value: string | null) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + "T00:00:00Z")));
}
export function resolveAnalyticsRange(params: URLSearchParams, now = new Date()) {
  const today = doualaToday(now);
  const period = (params.get("range") || "30d") as AnalyticsPeriod;
  let from = params.get("from") || "";
  let to = params.get("to") || today;
  if (period !== "custom") {
    const days = period === "7d" ? 7 : period === "90d" ? 90 : period === "365d" ? 365 : 30;
    to = today;
    from = addDays(today, -(days - 1));
  }
  if (!validDate(from) || !validDate(to) || to < from || dayDiff(from, to) > 730) {
    throw new Error("Période invalide. Choisissez un intervalle de 1 à 730 jours.");
  }
  const duration = dayDiff(from, to);
  const compareTo = addDays(from, -1);
  const compareFrom = addDays(compareTo, -(duration - 1));
  const requestedGroup = params.get("groupBy") as AnalyticsGroup | null;
  const groupBy: AnalyticsGroup = ["day", "week", "month", "quarter", "year"].includes(requestedGroup || "")
    ? requestedGroup as AnalyticsGroup : duration <= 45 ? "day" : duration <= 180 ? "week" : "month";
  return { period: period === "custom" ? "custom" : period, from, to, compareFrom, compareTo, groupBy, timeZone: ANALYTICS_TIME_ZONE };
}
function bucketStart(date: string, group: AnalyticsGroup) {
  const value = new Date(date + "T12:00:00.000Z");
  if (group === "year") return date.slice(0, 4) + "-01-01";
  if (group === "quarter") {
    const month = Math.floor(value.getUTCMonth() / 3) * 3 + 1;
    return date.slice(0, 4) + "-" + String(month).padStart(2, "0") + "-01";
  }
  if (group === "month") return date.slice(0, 7) + "-01";
  if (group === "week") {
    const day = (value.getUTCDay() + 6) % 7;
    value.setUTCDate(value.getUTCDate() - day);
    return value.toISOString().slice(0, 10);
  }
  return date;
}
function sum(rows: any[]) {
  return rows.reduce((total, row) => total + (Number(row.value) || 0), 0);
}

async function countSource(db: ReturnType<typeof adminClient>, table: string) {
  try {
    const { count, error } = await db.from(table).select("id", { count: "exact", head: true });
    if (error) return { available: false, count: null as number | null, reason: error.message };
    return { available: true, count: count ?? 0, reason: null as string | null };
  } catch (error) {
    return { available: false, count: null, reason: error instanceof Error ? error.message : "Source indisponible." };
  }
}

async function loadAnalyticsHistory(db: ReturnType<typeof adminClient>, start: string, end: string) {
  const rows: any[] = [];
  const pageSize = 1000;
  const maxRows = 500000;
  for (let offset = 0; offset < maxRows; offset += pageSize) {
    const { data, error } = await db.from("JoblyAnalyticsDailySnapshot")
      .select("metricKey,snapshotDate,dimensionKey,value,status,source")
      .gte("snapshotDate", start).lte("snapshotDate", end)
      .order("metricKey", { ascending: true })
      .order("snapshotDate", { ascending: true })
      .order("dimensionKey", { ascending: true })
      .order("source", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) return { data: null, error };
    const page = data || [];
    rows.push(...page);
    if (page.length < pageSize) return { data: rows, error: null };
  }
  return {
    data: null,
    error: new Error("Le volume de séries BI dépasse la limite de sécurité de 500 000 lignes. Réduisez la période ou segmentez les dimensions."),
  };
}

export async function buildAnalytics360(db: ReturnType<typeof adminClient>, params: URLSearchParams) {
  const range = resolveAnalyticsRange(params);
  const start = range.compareFrom;
  const end = range.to;
  const [currentCounts, roleCounts, historyQuery, goalsQuery, alertQuery, decisionsQuery] = await Promise.all([
    Promise.all(ANALYTICS_METRICS.map(async (metric) => ({
      key: metric.key, label: metric.label, module: metric.module, ...(await countSource(db, metric.table)),
    }))),
    Promise.all(["TALENT", "RECRUITER", "PARTNER", "ADMIN"].map(async (role) => {
      const { count, error } = await db.from("User").select("id", { count: "exact", head: true }).eq("role", role);
      return { role, available: !error, count: error ? null : count ?? 0 };
    })),
    loadAnalyticsHistory(db, start, end),
    db.from("JoblyAnalyticsGoal").select("*").eq("active", true).lte("startsOn", range.to).gte("endsOn", range.from).limit(100),
    db.from("JoblyAnalyticsAlert").select("*").neq("status", "resolved").order("lastSeenAt", { ascending: false }).limit(50),
    db.from("JoblyAnalyticsDecision").select("*").neq("status", "done").neq("status", "dismissed").order("createdAt", { ascending: false }).limit(100),
  ]);

  const historyAvailable = !historyQuery.error;
  const rows = historyAvailable ? (historyQuery.data || []) : [];
  const allMetricKeys = ["users", "jobs", "recruiter_jobs", "applications", "companies", "partners", "events", "subscriptions", "payments", "communities", "community_posts", "community_members", "mobility_requests", "job_sources", "harvest_captures", "audit_events", "revenue_confirmed_xaf"];
  const metricKeys = ["users", "jobs", "recruiter_jobs", "applications", "payments", "events", "subscriptions", "mobility_requests", "harvest_captures", "revenue_confirmed_xaf"];
  const fromDate = range.from;
  const dates = new Map<string, any>();
  const span = dayDiff(start, end);
  for (let i = 0; i < span; i++) {
    const date = addDays(start, i);
    dates.set(date, { date, ...(Object.fromEntries(metricKeys.map((key) => [key, null]))) });
  }
  const perMetric = new Map<string, any[]>();
  for (const key of allMetricKeys) perMetric.set(key, []);
  const countryTotals = new Map<string, number>();
  for (const row of rows as any[]) {
    const date = String(row.snapshotDate).slice(0, 10);
    const key = String(row.metricKey);
    if (row.dimensionKey === "ALL") {
      if (perMetric.has(key)) perMetric.get(key)!.push(row);
      if (date >= fromDate && dates.has(date) && metricKeys.includes(key)) dates.get(date)[key] = Number(row.value) || 0;
    } else if (date >= fromDate && ["users", "jobs", "applications"].includes(key)) {
      const country = String(row.dimensionKey).toUpperCase();
      countryTotals.set(country, (countryTotals.get(country) || 0) + (Number(row.value) || 0));
    }
  }

  const visibleDates = [...dates.values()].filter((row) => row.date >= range.from);
  const grouped = new Map<string, any>();
  for (const row of visibleDates) {
    const key = bucketStart(row.date, range.groupBy);
    if (!grouped.has(key)) grouped.set(key, { date: key, ...Object.fromEntries(metricKeys.map((metric) => [metric, null])) });
    for (const metric of metricKeys) {
      if (row[metric] === null || row[metric] === undefined) continue;
      if (grouped.get(key)[metric] === null) grouped.get(key)[metric] = 0;
      grouped.get(key)[metric] += Number(row[metric]) || 0;
    }
  }
  const hasAnyHistory = rows.some((row: any) => row.dimensionKey === "ALL" && row.status === "observed");
  const series = [...grouped.values()].sort((a, b) => a.date.localeCompare(b.date)).map((row) => ({
    ...row, label: row.date,
  }));
  const summary = currentCounts.map((metric) => {
    const currentRows = (perMetric.get(metric.key) || []).filter((row: any) => row.snapshotDate >= range.from);
    const previousRows = (perMetric.get(metric.key) || []).filter((row: any) => row.snapshotDate >= range.compareFrom && row.snapshotDate <= range.compareTo);
    const hasPeriod = currentRows.length > 0;
    const current = sum(currentRows);
    const previous = sum(previousRows);
    return {
      ...metric,
      periodValue: hasPeriod ? current : null,
      previousValue: previousRows.length ? previous : null,
      change: previousRows.length ? (previous === 0 ? null : ((current - previous) / previous) * 100) : null,
      historyAvailable: hasPeriod,
    };
  });
  const rolesTotal = roleCounts.reduce((v, item) => v + (item.count || 0), 0);
  const countries = [...countryTotals.entries()].map(([country, value]) => ({ country, value }))
    .sort((a, b) => b.value - a.value).slice(0, 12);
  const forecastBases = ["users", "jobs", "applications", "revenue_confirmed_xaf"].map((key) => {
    const values = visibleDates
      .map((row) => row[key])
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    const average = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
    return { key, dailyAverage: average, days: values.length, available: values.length > 0 };
  });
  const forecasts = hasAnyHistory ? forecastBases.filter((item) => item.available && item.dailyAverage !== null).map((item) => ({
    metric: item.key,
    d7: Math.round(item.dailyAverage! * 7),
    d30: Math.round(item.dailyAverage! * 30),
    d90: Math.round(item.dailyAverage! * 90),
    method: "trend_baseline",
    confidence: item.days >= 30 ? "low_to_medium" : "low",
  })) : [];

  return {
    generatedAt: new Date().toISOString(),
    range,
    history: { available: historyAvailable, hasRows: hasAnyHistory, source: "created_at_backfill", note: hasAnyHistory ? "Volumes de créations et paiements confirmés, basés sur des horodatages disponibles." : "Aucune série historique disponible. Lancez la reconstruction pour les sources datées." },
    current: { metrics: currentCounts, roleCounts, rolesTotal },
    summary,
    series,
    metricKeys,
    countries,
    goals: goalsQuery.error ? [] : goalsQuery.data || [],
    alerts: alertQuery.error ? [] : alertQuery.data || [],
    decisions: decisionsQuery.error ? [] : decisionsQuery.data || [],
    forecasts,
    unavailable: {
      history: historyQuery.error ? "Migration Intelligence 360 non appliquée ou table inaccessible." : null,
      goals: goalsQuery.error ? "Objectifs indisponibles." : null,
      alerts: alertQuery.error ? "Alertes indisponibles." : null,
      decisions: decisionsQuery.error ? "Actions indisponibles." : null,
    },
  };
}

export function toIsoDate() { return doualaToday(); }
