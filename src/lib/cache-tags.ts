/**
 * Central cache tag constants.
 *
 * Rules:
 * - Entity-level tags (e.g. "cases") invalidate ALL cached queries for that entity.
 * - Instance-level tags (e.g. "case-<id>") invalidate only one record.
 * - Server Actions call revalidateTag() with the most specific tag possible.
 * - unstable_cache / 'use cache' functions annotate with cacheTag().
 *
 * Usage in Server Actions:
 *   revalidateTag(CACHE_TAGS.cases)            // list pages
 *   revalidateTag(CACHE_TAGS.caseDetail(id))   // single case detail
 *
 * Usage in cached fetches:
 *   unstable_cache(fn, [id], { tags: [CACHE_TAGS.caseDetail(id)] })
 */
export const CACHE_TAGS = {
  // Lists
  cases:            "cases",
  clients:          "clients",
  templates:        "templates",
  team:             "team",
  notifications:    "notifications",
  dashboard:        "dashboard",
  deletionRequests: "deletion-requests",

  // Instance helpers
  caseDetail:    (id: string)      => `case-${id}`,
  caseNotes:     (caseId: string)  => `case-notes-${caseId}`,
  clientDetail:  (id: string)      => `client-${id}`,
  templateDetail:(id: string)      => `template-${id}`,
  portalCase:    (token: string)   => `portal-${token}`,
} as const;
