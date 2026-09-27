const enabledEl = document.getElementById("enabled");
const fullyRemoveEl = document.getElementById("fullyRemove");
const keywordListEl = document.getElementById("keywordList");
const countEl = document.getElementById("count");
const savedMsg = document.getElementById("savedMsg");

// Parse a comma/newline separated string into a clean keyword array.
function parseKeywords(text) {
  return text
    .split(/[,\n]/)
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
    // de-dupe while preserving order
    .filter((v, i, arr) => arr.indexOf(v) === i);
}

function renderList(list) {
  keywordListEl.value = list.join(", ");
  updateCount();
}

function updateCount() {
  const n = parseKeywords(keywordListEl.value).length;
  countEl.textContent = n + " keyword" + (n === 1 ? "" : "s");
}

// Resolve the effective list the same way the content script does.
function resolveKeywords(res) {
  if (Array.isArray(res.keywordList) && res.keywordList.length) return res.keywordList;
  if (Array.isArray(res.customKeywords) && res.customKeywords.length) {
    return DEFAULT_AVIATION_KEYWORDS.concat(res.customKeywords);
  }
  return DEFAULT_AVIATION_KEYWORDS.slice();
}

// Load current state.
chrome.storage.sync.get(["enabled", "fullyRemove", "customKeywords", "keywordList"], (res) => {
  enabledEl.checked = res.enabled !== false; // default on
  fullyRemoveEl.checked = res.fullyRemove === true;
  renderList(resolveKeywords(res));
});

keywordListEl.addEventListener("input", updateCount);

enabledEl.addEventListener("change", () => {
  chrome.storage.sync.set({ enabled: enabledEl.checked });
});

fullyRemoveEl.addEventListener("change", () => {
  chrome.storage.sync.set({ fullyRemove: fullyRemoveEl.checked });
});

document.getElementById("save").addEventListener("click", () => {
  const list = parseKeywords(keywordListEl.value);
  // Store as the full override list. Clear the legacy key so it can't shadow it.
  chrome.storage.sync.set({ keywordList: list, customKeywords: [] }, () => {
    renderList(list);
    flash("Saved \u2713");
  });
});

document.getElementById("reset").addEventListener("click", () => {
  const list = DEFAULT_AVIATION_KEYWORDS.slice();
  chrome.storage.sync.set({ keywordList: list, customKeywords: [] }, () => {
    renderList(list);
    flash("Reset to defaults \u2713");
  });
});

function flash(msg) {
  savedMsg.textContent = msg;
  setTimeout(() => (savedMsg.textContent = ""), 1500);
}
