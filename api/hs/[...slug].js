export default async function handler(req, res) {
  // req.url = "/api/hs/crm/v3/objects/deals/search?foo=bar"
  // In non-Next.js Vercel runtimes req.query.slug is not parsed automatically
  const [pathname, queryString] = (req.url ?? "").split("?");
  const hsPath = pathname.replace(/^\/api\/hs/, "") || "/";
  const url = `https://api.hubapi.com${hsPath}${queryString ? `?${queryString}` : ""}`;

  const headers = { "Content-Type": "application/json" };
  const auth = req.headers["authorization"];
  if (auth) headers["Authorization"] = auth;

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  let body;
  if (hasBody) {
    if (req.body != null) {
      body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    } else {
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
