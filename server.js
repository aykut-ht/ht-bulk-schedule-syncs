const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const HIGHTOUCH_BASE = "https://api.hightouch.com/api/v1";

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

function buildRequestLog(syncId, schedule) {
  return {
    method: "PATCH",
    url: `${HIGHTOUCH_BASE}/syncs/${syncId}`,
    headers: {
      Authorization: "Bearer [REDACTED]",
      "Content-Type": "application/json",
    },
    body: { schedule },
  };
}

function serializeError(err) {
  const details = { message: err.message };
  if (err.cause) {
    details.cause = err.cause.message || String(err.cause);
    if (err.cause.code) details.code = err.cause.code;
  }
  if (err.code) details.code = err.code;
  return details;
}

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
    const requestLog = buildRequestLog(syncId, schedule);

    if (!syncId || !/^\d+$/.test(syncId)) {
      results.push({
        syncId: rawId,
        ok: false,
        error: "Invalid sync ID",
        log: { request: requestLog, response: null, error: { message: "Invalid sync ID" } },
      });
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
      let body;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = text;
      }

      const responseLog = {
        status: response.status,
        statusText: response.statusText,
        headers: {
          "content-type": response.headers.get("content-type"),
        },
        body,
      };

      if (!response.ok) {
        const message =
          typeof body === "object" && body !== null
            ? body.message || body.details || JSON.stringify(body)
            : String(body);
        results.push({
          syncId,
          ok: false,
          status: response.status,
          error: message,
          log: { request: requestLog, response: responseLog },
        });
      } else {
        results.push({
          syncId,
          ok: true,
          status: response.status,
          slug: body?.slug,
          log: { request: requestLog, response: responseLog },
        });
      }
    } catch (err) {
      const errorDetails = serializeError(err);
      results.push({
        syncId,
        ok: false,
        error: err.message,
        log: { request: requestLog, response: null, error: errorDetails },
      });
    }
  }

  res.json({ results });
});

app.listen(PORT, () => {
  console.log(`Bulk Schedule Syncs running at http://localhost:${PORT}`);
});
