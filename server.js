const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const HIGHTOUCH_BASE = "https://api.hightouch.com/api/v1";

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/update-syncs", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing API key" });
  }

  const { syncIds, schedule } = req.body;
  if (!Array.isArray(syncIds) || syncIds.length === 0) {
    return res.status(400).json({ error: "Provide at least one sync ID" });
  }

  const results = [];

  for (const rawId of syncIds) {
    const syncId = String(rawId).trim();
    if (!syncId || !/^\d+$/.test(syncId)) {
      results.push({ syncId: rawId, ok: false, error: "Invalid sync ID" });
      continue;
    }

    try {
      const response = await fetch(`${HIGHTOUCH_BASE}/syncs/${syncId}`, {
        method: "PATCH",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ schedule }),
      });

      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = text;
      }

      if (!response.ok) {
        const message =
          typeof data === "object" && data !== null
            ? data.message || data.details || JSON.stringify(data)
            : String(data);
        results.push({ syncId, ok: false, status: response.status, error: message });
      } else {
        results.push({ syncId, ok: true, status: response.status, slug: data?.slug });
      }
    } catch (err) {
      results.push({ syncId, ok: false, error: err.message });
    }
  }

  res.json({ results });
});

app.listen(PORT, () => {
  console.log(`Bulk Schedule Syncs running at http://localhost:${PORT}`);
});
