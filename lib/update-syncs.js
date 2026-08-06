const HIGHTOUCH_BASE = "https://api.hightouch.com/api/v1";

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

async function updateSyncs(authHeader, syncIds, schedule) {
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
      results.push({
        syncId,
        ok: false,
        error: err.message,
        log: { request: requestLog, response: null, error: serializeError(err) },
      });
    }
  }

  return results;
}

module.exports = { updateSyncs };
