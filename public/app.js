const SCHEDULES = {
  manual: null,
  "15m": { type: "interval", schedule: { interval: { unit: "minute", quantity: 15 } } },
  "30m": { type: "interval", schedule: { interval: { unit: "minute", quantity: 30 } } },
  "1h": { type: "interval", schedule: { interval: { unit: "hour", quantity: 1 } } },
  "6h": { type: "interval", schedule: { interval: { unit: "hour", quantity: 6 } } },
  "12h": { type: "interval", schedule: { interval: { unit: "hour", quantity: 12 } } },
  "1d": { type: "interval", schedule: { interval: { unit: "day", quantity: 1 } } },
  "1w": { type: "interval", schedule: { interval: { unit: "week", quantity: 1 } } },
};

const form = document.getElementById("update-form");
const apiKeyInput = document.getElementById("api-key");
const syncIdsInput = document.getElementById("sync-ids");
const frequencySelect = document.getElementById("frequency");
const submitBtn = document.getElementById("submit-btn");
const toggleKeyBtn = document.getElementById("toggle-key");
const resultsSection = document.getElementById("results");

toggleKeyBtn.addEventListener("click", () => {
  const isPassword = apiKeyInput.type === "password";
  apiKeyInput.type = isPassword ? "text" : "password";
  toggleKeyBtn.textContent = isPassword ? "Hide" : "Show";
  toggleKeyBtn.setAttribute("aria-label", isPassword ? "Hide API key" : "Show API key");
});

function parseSyncIds(text) {
  return [...new Set(
    text
      .split(/[\n,]+/)
      .map((id) => id.trim())
      .filter(Boolean)
  )];
}

function renderResults(results) {
  const succeeded = results.filter((r) => r.ok).length;
  const failed = results.length - succeeded;

  const items = results
    .map((r) => {
      if (r.ok) {
        const slug = r.slug ? ` (${r.slug})` : "";
        return `<li class="result-item success"><span class="status">OK</span><span>Sync ${r.syncId}${slug}</span></li>`;
      }
      return `<li class="result-item error"><span class="status">Failed</span><span>Sync ${r.syncId}<span class="detail"> — ${escapeHtml(r.error)}</span></span></li>`;
    })
    .join("");

  resultsSection.innerHTML = `
    <h2>Results</h2>
    <p class="summary"><span class="ok">${succeeded} updated</span>${failed ? ` · <span class="fail">${failed} failed</span>` : ""}</p>
    <ul class="result-list">${items}</ul>
  `;
  resultsSection.classList.remove("hidden");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const apiKey = apiKeyInput.value.trim();
  const syncIds = parseSyncIds(syncIdsInput.value);
  const schedule = SCHEDULES[frequencySelect.value];

  if (!apiKey) {
    alert("Please enter your Hightouch API key.");
    return;
  }

  if (syncIds.length === 0) {
    alert("Please enter at least one sync ID.");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = `Updating ${syncIds.length} sync${syncIds.length === 1 ? "" : "s"}…`;
  resultsSection.classList.add("hidden");

  try {
    const response = await fetch("/api/update-syncs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ syncIds, schedule }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Request failed");
    }

    renderResults(data.results);
  } catch (err) {
    resultsSection.innerHTML = `<h2>Error</h2><p class="summary fail">${escapeHtml(err.message)}</p>`;
    resultsSection.classList.remove("hidden");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Update schedules";
  }
});
