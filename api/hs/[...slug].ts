// Proxy serverless — evita CORS entre el browser y api.hubapi.com
export const config = { api: { bodyParser: true } };

export default async function handler(req: any, res: any) {
  const slugParts: string[] = Array.isArray(req.query.slug)
    ? req.query.slug
    : [req.query.slug ?? ""];

  const hsPath = "/" + slugParts.join("/");

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query as Record<string, string>)) {
    if (key === "slug") continue;
    params.set(key, value);
  }
  const qs = params.toString();
  const url = `https://api.hubapi.com${hsPath}${qs ? `?${qs}` : ""}`;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const auth = req.headers["authorization"];
  if (auth) headers["Authorization"] = auth;

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  let bodyStr: string | undefined;
  if (hasBody && req.body !== undefined && req.body !== null) {
    bodyStr = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
  }

  const hsRes = await fetch(url, {
    method: req.method,
    headers,
    body: bodyStr,
  });

  const text = await hsRes.text();
  res.status(hsRes.status).setHeader("Content-Type", "application/json").end(text);
}
