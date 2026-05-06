export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  const slugParts = Array.isArray(req.query.slug)
    ? req.query.slug
    : [req.query.slug ?? ""];

  const hsPath = "/" + slugParts.join("/");

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (key === "slug") continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  const url = `https://api.hubapi.com${hsPath}${qs ? `?${qs}` : ""}`;

  const headers = { "Content-Type": "application/json" };
  const auth = req.headers["authorization"];
  if (auth) headers["Authorization"] = auth;

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  let body;
  if (hasBody && req.body != null) {
    body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
  }

  const hsRes = await fetch(url, { method: req.method, headers, body });
  const text = await hsRes.text();
  res.status(hsRes.status).setHeader("Content-Type", "application/json").end(text);
}
