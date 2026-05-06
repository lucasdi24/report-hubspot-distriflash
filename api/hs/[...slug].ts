// Vercel serverless proxy — evita CORS entre el browser y api.hubapi.com
export default async function handler(req: any, res: any) {
  const slugParts: string[] = Array.isArray(req.query.slug)
    ? req.query.slug
    : [req.query.slug ?? ""];

  const hsPath = "/" + slugParts.join("/");

  // Rearmamos query string sin incluir el parámetro 'slug' de Vercel
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query as Record<string, string>)) {
    if (key === "slug") continue;
    params.set(key, value);
  }
  const qs = params.toString();
  const url = `https://api.hubapi.com${hsPath}${qs ? `?${qs}` : ""}`;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const auth = req.headers.authorization;
  if (auth) headers["Authorization"] = auth;

  const hsRes = await fetch(url, {
    method: req.method,
    headers,
    body:
      req.method !== "GET" && req.method !== "HEAD" && req.body
        ? JSON.stringify(req.body)
        : undefined,
  });

  const data = await hsRes.json().catch(() => null);
  res.status(hsRes.status).json(data);
}
