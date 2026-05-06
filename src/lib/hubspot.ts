const BASE = "/api";

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

async function hs<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `HTTP ${res.status} — ${path}`);
  }
  return res.json() as Promise<T>;
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
  maxRecords = 500
): Promise<T[]> {
  const results: T[] = [];
  let after: string | undefined;

  do {
    const body: Record<string, unknown> = {
      filterGroups: [{ filters }],
      properties,
      limit: 100,
      sorts: [{ propertyName: "createdate", direction: "DESCENDING" }],
    };
    if (after) body.after = after;

    const data = await hs<{ results: T[]; paging?: { next?: { after: string } } }>(
      token,
      `/crm/v3/objects/${object}/search`,
      { method: "POST", body: JSON.stringify(body) }
    );

    results.push(...data.results);
    after = data.paging?.next?.after;
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
