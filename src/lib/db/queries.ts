/**
 * Cached DB query library — Next.js 16 `'use cache'` pattern
 *
 * Architecture:
 *  - Every function uses the `'use cache'` directive so Next.js stores the result
 *    in its server-side cache (memory / remote, depending on deployment).
 *  - We use `createAdminClient()` (service-role, no cookies) so these functions
 *    contain NO dynamic APIs and can be safely cached across requests.
 *  - `cacheTag(CACHE_TAGS.x)` links the result to a tag; Server Actions call
 *    `revalidateTag(tag, {})` after mutations → instant invalidation.
 *  - `cacheLife()` sets TTL profiles so stale data is never exposed for long.
 *
 * Cache key = function source + all arguments → orgId scopes cache per tenant.
 *
 * TTLs (via cacheLife):
 *   'seconds' → stale 30s  | revalidate 1s   | expire 60s
 *   'minutes' → stale 5min | revalidate 1min  | expire 1h
 *   'hours'   → stale 5min | revalidate 1h    | expire 1d
 */

import { cacheTag, cacheLife } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server-admin";
import { CACHE_TAGS } from "@/lib/cache-tags";

// ─── Cases ────────────────────────────────────────────────────────────────────

export type CasesViewMode = 'all' | 'assigned' | 'mine';

export async function getCasesList(
  orgId: string,
  userId?: string,
  view: CasesViewMode = 'all'
) {
  "use cache";
  cacheTag(CACHE_TAGS.cases);
  if (userId && view !== 'all') cacheTag(`cases-user-${userId}`);
  cacheLife("minutes");

  const supabase = createAdminClient();
  let query = supabase
    .from("cases")
    .select("*, client:clients(full_name)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (view === 'assigned' && userId) {
    query = query.eq("assigned_to", userId);
  } else if (view === 'mine' && userId) {
    query = query.eq("created_by", userId);
  }

  const { data } = await query;
  return data ?? [];
}

export async function getCasesKanban(
  orgId: string,
  userId?: string,
  view: CasesViewMode = 'all'
) {
  "use cache";
  cacheTag(CACHE_TAGS.cases);
  if (userId && view !== 'all') cacheTag(`cases-user-${userId}`);
  cacheLife("minutes");

  const supabase = createAdminClient();
  let query = supabase
    .from("cases")
    .select("id, token, status, updated_at, assigned_to, client:clients(full_name)")
    .eq("org_id", orgId)
    .order("updated_at", { ascending: false });

  if (view === 'assigned' && userId) {
    query = query.eq("assigned_to", userId);
  } else if (view === 'mine' && userId) {
    query = query.eq("created_by", userId);
  }

  const { data } = await query;
  return data ?? [];
}

export async function getCaseById(id: string, orgId: string) {
  "use cache";
  cacheTag(CACHE_TAGS.caseDetail(id));
  cacheLife("minutes");

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("cases")
    .select("*, client:clients(*), files:case_files(*)")
    .eq("id", id)
    .eq("org_id", orgId)
    .single();

  return { data, error };
}

export async function getCaseByToken(token: string) {
  "use cache";
  cacheTag(CACHE_TAGS.portalCase(token));
  cacheLife("minutes");

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .rpc("get_case_by_token", { p_token: token });

  return { data, error };
}

// ─── Clients ──────────────────────────────────────────────────────────────────

export type ClientsViewMode = 'all' | 'mine';

export async function getClientsList(orgId: string, userId?: string, view: ClientsViewMode = 'all') {
  "use cache";
  cacheTag(CACHE_TAGS.clients);
  if (userId && view === 'mine') cacheTag(`clients-user-${userId}`);
  cacheLife("minutes");

  const supabase = createAdminClient();
  let query = supabase
    .from("clients")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (view === 'mine' && userId) {
    query = query.eq("assigned_lawyer_id", userId);
  }

  const { data } = await query;
  return data ?? [];
}

export async function getClientById(id: string, orgId: string) {
  "use cache";
  cacheTag(CACHE_TAGS.clientDetail(id));
  cacheLife("minutes");

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .eq("org_id", orgId)
    .single();

  return data ?? null;
}

export async function getClientCases(clientId: string, orgId: string) {
  "use cache";
  cacheTag(CACHE_TAGS.cases);
  cacheTag(CACHE_TAGS.clientDetail(clientId));
  cacheLife("minutes");

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("cases")
    .select("*")
    .eq("client_id", clientId)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  return data ?? [];
}

/** Minimal projection for form selectors — faster than getClientsList */
export async function getClientsForSelector(orgId: string) {
  "use cache";
  cacheTag(CACHE_TAGS.clients);
  cacheLife("minutes");

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("clients")
    .select("id, full_name")
    .eq("org_id", orgId)
    .in("status", ["active", "prospect"])
    .order("full_name");

  return data ?? [];
}

// ─── Templates ────────────────────────────────────────────────────────────────

export async function getTemplatesList(orgId: string) {
  "use cache";
  cacheTag(CACHE_TAGS.templates);
  cacheLife("hours");

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  return { data: data ?? [], error };
}

/** Minimal projection for case creation form */
export async function getTemplatesForSelector(orgId: string) {
  "use cache";
  cacheTag(CACHE_TAGS.templates);
  cacheLife("hours");

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("templates")
    .select("id, title, schema")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function getTemplateById(id: string, orgId: string) {
  "use cache";
  cacheTag(CACHE_TAGS.templateDetail(id));
  cacheLife("hours");

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("templates")
    .select("*")
    .eq("id", id)
    .eq("org_id", orgId)
    .single();

  return data ?? null;
}

// ─── Organization ─────────────────────────────────────────────────────────────

export async function getOrgSettings(orgId: string) {
  "use cache";
  cacheTag(CACHE_TAGS.dashboard);
  cacheLife("hours");

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("organizations")
    .select("id, name, primary_color, logo_url, consent_text, storage_used, plan_tier, members_can_see_all_cases, members_can_see_all_clients, whatsapp_template")
    .eq("id", orgId)
    .single();

  return data ?? null;
}

// ─── Team ─────────────────────────────────────────────────────────────────────

export async function getOrgTeam(orgId: string) {
  "use cache";
  cacheTag(CACHE_TAGS.team);
  cacheLife("minutes");

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role, updated_at, cases!cases_assigned_to_fkey(count)")
    .eq("org_id", orgId);

  return data ?? [];
}

export async function getOrgPendingInvitations(orgId: string) {
  "use cache";
  cacheTag(CACHE_TAGS.team);
  cacheLife("minutes");

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("invitations")
    .select("*")
    .eq("org_id", orgId)
    .eq("status", "pending");

  return data ?? [];
}

/** Includes email (from auth.users) via SECURITY DEFINER RPC */
export async function getOrgMembersWithEmail(orgId: string) {
  "use cache";
  cacheTag(CACHE_TAGS.team);
  cacheLife("minutes");

  const supabase = createAdminClient();
  const { data } = await supabase.rpc("get_org_members_with_email", {
    p_org_id: orgId,
  });

  return data ?? [];
}

// ─── Case Notes ───────────────────────────────────────────────────────────────

export async function getCaseNotes(caseId: string) {
  "use cache";
  cacheTag(CACHE_TAGS.caseNotes(caseId));
  cacheTag(CACHE_TAGS.caseDetail(caseId));
  cacheLife("minutes");

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("case_notes")
    .select(
      "id, content, created_at, author_id, author:profiles(id, full_name, avatar_url)"
    )
    .eq("case_id", caseId)
    .order("created_at", { ascending: true });

  return data ?? [];
}

// ─── Dashboard KPIs ───────────────────────────────────────────────────────────

export async function getOrgDashboardKpis(orgId: string) {
  "use cache";
  cacheTag(CACHE_TAGS.dashboard);
  cacheTag(CACHE_TAGS.cases);
  cacheTag(CACHE_TAGS.clients);
  cacheLife("minutes");

  const supabase = createAdminClient();
  const startOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  ).toISOString();

  const [
    { count: clientCount },
    { count: casesActiveCount },
    { count: filesPendingCount },
    { count: newClientsMonth },
    { count: newCasesMonth },
    { count: templateCount },
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "active"),
    supabase
      .from("cases")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .in("status", ["in_progress", "review"]),
    supabase
      .from("case_files")
      .select("*, cases!inner(org_id)", { count: "exact", head: true })
      .eq("status", "pending")
      .eq("cases.org_id", orgId),
    supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .gte("created_at", startOfMonth),
    supabase
      .from("cases")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .gte("created_at", startOfMonth),
    supabase
      .from("templates")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId),
  ]);

  return {
    clientCount: clientCount ?? 0,
    casesActiveCount: casesActiveCount ?? 0,
    filesPendingCount: filesPendingCount ?? 0,
    newClientsMonth: newClientsMonth ?? 0,
    newCasesMonth: newCasesMonth ?? 0,
    templateCount: templateCount ?? 0,
  };
}

export async function getOrgCaseDistribution(orgId: string) {
  "use cache";
  cacheTag(CACHE_TAGS.cases);
  cacheLife("minutes");

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("cases")
    .select("status")
    .eq("org_id", orgId);

  return data ?? [];
}

export async function getOrgAuditLogsWithActors(orgId: string) {
  "use cache";
  cacheTag(CACHE_TAGS.dashboard);
  cacheLife("seconds"); // Logs change frequently — short TTL

  const supabase = createAdminClient();
  const { data: logs } = await supabase
    .from("audit_logs")
    .select("id, action, created_at, metadata, actor_id")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(30)
    .returns<{ id: string; action: string; created_at: string; metadata: Record<string, unknown>; actor_id: string | null }[]>();

  if (!logs || logs.length === 0) {
    return { logs: [], actorsMap: {} as Record<string, string> };
  }

  const actorIds = Array.from(
    new Set(logs.map((l) => l.actor_id).filter(Boolean) as string[])
  );

  const actorsMap: Record<string, string> = {};
  if (actorIds.length > 0) {
    const { data: actors } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", actorIds);
    actors?.forEach((a) => {
      if (a.full_name) actorsMap[a.id] = a.full_name;
    });
  }

  return { logs, actorsMap };
}

export async function getLawyerDashboardData(userId: string, orgId: string) {
  "use cache";
  cacheTag(CACHE_TAGS.cases);
  cacheTag(CACHE_TAGS.clients);
  cacheLife("minutes");

  const supabase = createAdminClient();

  const [
    { data: allMyCases },
    { data: recentCases },
    { count: assignedClientsCount },
    { data: pendingDocsCases },
    { data: myDeletionRequests },
  ] = await Promise.all([
    // All my cases for status breakdown
    supabase
      .from("cases")
      .select("status")
      .or(`assigned_to.eq.${userId},created_by.eq.${userId}`)
      .eq("org_id", orgId),
    // 5 most recent for the list widget
    supabase
      .from("cases")
      .select("id, token, status, updated_at, clients(full_name)")
      .or(`assigned_to.eq.${userId},created_by.eq.${userId}`)
      .eq("org_id", orgId)
      .order("updated_at", { ascending: false })
      .limit(5),
    // Clients directly assigned to me
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("assigned_lawyer_id", userId)
      .eq("org_id", orgId),
    // Cases with pending documents (at least one pending file)
    supabase
      .from("cases")
      .select("id, case_files!inner(status)")
      .or(`assigned_to.eq.${userId},created_by.eq.${userId}`)
      .eq("org_id", orgId)
      .eq("case_files.status", "pending"),
    // My pending deletion requests
    supabase
      .from("deletion_requests")
      .select("id, entity_type, entity_label, status, created_at")
      .eq("requested_by", userId)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  // Status breakdown
  const statusBreakdown: Record<string, number> = {};
  (allMyCases ?? []).forEach((c) => {
    statusBreakdown[c.status] = (statusBreakdown[c.status] || 0) + 1;
  });
  const activeCasesCount = (statusBreakdown["in_progress"] || 0) + (statusBreakdown["review"] || 0);

  return {
    myCasesCount: activeCasesCount,
    totalCases: (allMyCases ?? []).length,
    statusBreakdown,
    recentCases: recentCases ?? [],
    assignedClientsCount: assignedClientsCount ?? 0,
    pendingDocsCount: (pendingDocsCases ?? []).length,
    myPendingDeletionRequests: myDeletionRequests ?? [],
  };
}

// ─── Deletion Requests ────────────────────────────────────────────────────────

export async function getDeletionRequests(orgId: string) {
  "use cache";
  cacheTag(CACHE_TAGS.deletionRequests);
  cacheLife("seconds");

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("deletion_requests")
    .select("*, requester:profiles!deletion_requests_requested_by_fkey(full_name, avatar_url)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  return data ?? [];
}
