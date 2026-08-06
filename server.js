const express = require("express");
const { updateSyncs } = require("./lib/update-syncs");

const app = express();
const PORT = process.env.PORT || 3000;

const ALLOWED_ORIGINS = new Set([
  "https://aykut-ht.github.io",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Vary", "Origin");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
});

app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));

app.post("/api/update-syncs", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing API key" });
  }

  const { syncIds, schedule } = req.body;
  if (!Array.isArray(syncIds) || syncIds.length === 0) {
    return res.status(400).json({ error: "Provide at least one sync ID" });
  }

  const results = await updateSyncs(authHeader, syncIds, schedule);
  res.json({ results });
});

app.listen(PORT, () => {
  console.log(`Bulk Schedule Syncs running at http://localhost:${PORT}`);
});
