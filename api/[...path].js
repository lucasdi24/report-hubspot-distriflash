export default async function handler(req, res) {
  let pathAndQuery = req.url || "/";
  if (pathAndQuery.startsWith("/api/")) pathAndQuery = pathAndQuery.slice(4);
  else if (pathAndQuery === "/api") pathAndQuery = "/";

  const target = `https://api.hubapi.com${pathAndQuery}`;

  let body;
  if (req.method !== "GET" && req.method !== "HEAD") {
    if (req.body != null && req.body !== "") {
      body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    } else {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const buf = Buffer.concat(chunks);
      body = buf.length > 0 ? buf.toString("utf8") : undefined;
    }
  }

  const hsRes = await fetch(target, {
    method: req.method,
    headers: {
      "Content-Type": "application/json",
      Authorization: req.headers.authorization || "",
    },
    body,
  });

  const text = await hsRes.text();
  res.setHeader("Content-Type", "application/json");
  res.status(hsRes.status).send(text);
}
