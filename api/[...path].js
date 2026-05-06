export default async function handler(req, res) {
  const [pathname, queryString] = (req.url ?? "").split("?");
  // Strip /api prefix (Vercel may or may not include it in req.url)
  const hsPath = pathname.replace(/^\/api/, "") || "/";
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
