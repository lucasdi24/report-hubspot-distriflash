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
  if (hasBody) {
    if (req.body != null) {
      body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    } else {
      // Vercel may not parse body automatically — read from stream
      body = await new Promise((resolve) => {
        let data = "";
        req.on("data", (chunk) => { data += chunk; });
        req.on("end", () => resolve(data || undefined));
      });
    }
  }

  const hsRes = await fetch(url, { method: req.method, headers, body });
  const text = await hsRes.text();
  res.status(hsRes.status).setHeader("Content-Type", "application/json").end(text);
}
