const express = require("express");
const { updateSyncs } = require("./lib/update-syncs");

const app = express();
const PORT = process.env.PORT || 3000;

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
