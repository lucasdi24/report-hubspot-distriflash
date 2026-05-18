const BASE = "/api/proxy";

export interface AccountInfo {
  portalId: number;
  companyName: string;
  timeZone: string;
  currency: string;
  uiDomain: string;
}

export interface PipelineStage {
  id: string;
  label: string;
  displayOrder: number;
  metadata: { isClosed?: string; probability?: string };
}

export interface Pipeline {
  id: string;
  label: string;
  stages: PipelineStage[];
}

export interface HSDeal {
  id: string;
  properties: {
    dealname: string | null;
    amount: string | null;
    dealstage: string | null;
    pipeline: string | null;
    closedate: string | null;
    createdate: string | null;
    hubspot_owner_id: string | null;
  };
}

export interface HSContact {
  id: string;
  properties: {
    firstname: string | null;
    lastname: string | null;
    email: string | null;
    hs_analytics_source: string | null;
    createdate: string | null;
    hs_lead_status: string | null;
    hubspot_owner_id: string | null;
  };
}

export interface HSOwner {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function hs<T>(token: string, path: string, init?: RequestInit, retries = 4): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(BASE, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "x-hs-path": path,
        ...(init?.headers ?? {}),
      },
    });
    if (res.ok) return res.json() as Promise<T>;

    // Rate-limit: HubSpot devuelve 429 con header Retry-After
    if (res.status === 429 && attempt < retries) {
      const retryAfter = parseInt(res.headers.get("retry-after") || "1", 10);
      await sleep(Math.max(retryAfter * 1000, 250 * Math.pow(2, attempt)));
      continue;
    }

    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `HTTP ${res.status} — ${path}`);
  }
  throw new Error(`Rate-limit excedido tras ${retries} reintentos: ${path}`);
}

export async function fetchAccountInfo(token: string): Promise<AccountInfo> {
  return hs<AccountInfo>(token, "/account-info/v3/details");
}

export async function fetchPipelines(token: string): Promise<Pipeline[]> {
  const data = await hs<{ results: Pipeline[] }>(token, "/crm/v3/pipelines/deals");
  return data.results;
}

async function searchAll<T>(
  token: string,
  object: string,
  properties: string[],
  filters: { propertyName: string; operator: string; value: string }[],
  sortProperty: string = "createdate",
  maxRecords = 500
): Promise<T[]> {
  const results: T[] = [];
  let after: string | undefined;

  do {
    const body: Record<string, unknown> = {
      filterGroups: [{ filters }],
      properties,
      limit: 100,
      sorts: [{ propertyName: sortProperty, direction: "DESCENDING" }],
    };
    if (after) body.after = after;

    const data = await hs<{ results: T[]; paging?: { next?: { after: string } } }>(
      token,
      `/crm/v3/objects/${object}/search`,
      { method: "POST", body: JSON.stringify(body) }
    );

    results.push(...data.results);
    after = data.paging?.next?.after;

    // Throttle ~7 req/s para no chocar contra el "secondly limit" (10/s) de HubSpot
    if (after && results.length < maxRecords) await sleep(150);
  } while (after && results.length < maxRecords);

  return results;
}

export async function fetchDeals(token: string, from: Date, to: Date): Promise<HSDeal[]> {
  return searchAll<HSDeal>(
    token,
    "deals",
    ["dealname", "amount", "dealstage", "pipeline", "closedate", "createdate", "hubspot_owner_id"],
    [
      { propertyName: "createdate", operator: "GTE", value: from.getTime().toString() },
      { propertyName: "createdate", operator: "LTE", value: to.getTime().toString() },
    ]
  );
}

export async function fetchOwners(token: string): Promise<HSOwner[]> {
  const data = await hs<{ results: HSOwner[] }>(token, "/crm/v3/owners?limit=100");
  return data.results;
}

export async function fetchContacts(token: string, from: Date, to: Date): Promise<HSContact[]> {
  return searchAll<HSContact>(
    token,
    "contacts",
    ["firstname", "lastname", "email", "hs_analytics_source", "createdate", "hs_lead_status", "hubspot_owner_id"],
    [
      { propertyName: "createdate", operator: "GTE", value: from.getTime().toString() },
      { propertyName: "createdate", operator: "LTE", value: to.getTime().toString() },
    ]
  );
}

// Source labels mapping
export const SOURCE_LABELS: Record<string, string> = {
  ORGANIC_SEARCH: "Búsqueda orgánica",
  PAID_SEARCH: "Búsqueda paga",
  EMAIL_MARKETING: "Email marketing",
  SOCIAL_MEDIA: "Redes sociales",
  REFERRALS: "Referidos",
  OTHER_CAMPAIGNS: "Otras campañas",
  DIRECT_TRAFFIC: "Tráfico directo",
  OFFLINE: "Offline",
  PAID_SOCIAL: "Social paga",
  "": "Desconocida",
};

export function sourceLabel(src: string | null): string {
  if (!src) return "Desconocida";
  return SOURCE_LABELS[src] ?? src;
}

// ─── Engagements (calls, emails, meetings, notes, tasks) ─────────────────────

export type EngagementType = "calls" | "emails" | "meetings" | "notes" | "tasks";

export const ENGAGEMENT_LABELS: Record<EngagementType, string> = {
  calls: "Llamadas",
  emails: "Emails",
  meetings: "Reuniones",
  notes: "Notas",
  tasks: "Tareas",
};

export interface HSEngagement {
  id: string;
  properties: {
    hubspot_owner_id: string | null;
    hs_createdate: string | null;
  };
}

export interface EngagementResult {
  type: EngagementType;
  items: HSEngagement[];
  error?: string;
}

async function fetchEngagementType(
  token: string,
  type: EngagementType,
  from: Date,
  to: Date
): Promise<EngagementResult> {
  try {
    const items = await searchAll<HSEngagement>(
      token,
      type,
      ["hubspot_owner_id", "hs_createdate"],
      [
        { propertyName: "hs_createdate", operator: "GTE", value: from.getTime().toString() },
        { propertyName: "hs_createdate", operator: "LTE", value: to.getTime().toString() },
      ],
      "hs_createdate",
      2000 // max records — engagements suelen ser muchos más que deals/contactos
    );
    return { type, items };
  } catch (e) {
    return { type, items: [], error: e instanceof Error ? e.message : String(e) };
  }
}

export async function fetchAllEngagements(
  token: string,
  from: Date,
  to: Date
): Promise<Record<EngagementType, EngagementResult>> {
  const types: EngagementType[] = ["calls", "emails", "meetings", "notes", "tasks"];
  const out: Partial<Record<EngagementType, EngagementResult>> = {};
  for (const t of types) {
    out[t] = await fetchEngagementType(token, t, from, to);
  }
  return out as Record<EngagementType, EngagementResult>;
}
