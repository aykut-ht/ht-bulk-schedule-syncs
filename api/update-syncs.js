const { updateSyncs } = require("../lib/update-syncs");

const ALLOWED_ORIGINS = new Set([
  "https://aykut-ht.github.io",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

function applyCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Vary", "Origin");
}

module.exports = async (req, res) => {
  applyCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing API key" });
  }

  const { syncIds, schedule } = req.body || {};
  if (!Array.isArray(syncIds) || syncIds.length === 0) {
    return res.status(400).json({ error: "Provide at least one sync ID" });
  }

  const results = await updateSyncs(authHeader, syncIds, schedule);
  return res.status(200).json({ results });
};
