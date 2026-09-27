/* Aviation Only - X Feed Filter (content script)
 * Hides timeline posts whose text doesn't match any aviation keyword.
 * State (on/off, mode, custom keywords) lives in chrome.storage.sync.
 */
(function () {
  "use strict";

  const state = {
    enabled: true,
    fullyRemove: false,      // false = collapse+dim, true = display:none
    keywords: DEFAULT_AVIATION_KEYWORDS.slice(),
    kept: 0,
    hidden: 0
  };

  const ATTR = "data-avf";

  // When the extension is reloaded/updated, this old content script loses its
  // connection ("Extension context invalidated"). Detect that and shut down
  // quietly instead of throwing on every chrome.* call.
  function extensionAlive() {
    try {
      return !!(chrome.runtime && chrome.runtime.id);
    } catch (e) {
      return false;
    }
  }

  const timers = [];
  function shutdown() {
    try { if (observer) observer.disconnect(); } catch (e) {}
    timers.forEach(clearInterval);
    // Reveal any posts we had hidden so the page is left clean.
    try {
      document.querySelectorAll("article[" + ATTR + "]").forEach(clearHidden);
    } catch (e) {}
    const b = document.getElementById("avf-badge");
    if (b) b.remove();
  }

  // Safe wrappers: no-op if the extension context is gone.
  function safeStorageGet(keys, cb) {
    if (!extensionAlive()) return;
    try { chrome.storage.sync.get(keys, cb); } catch (e) { shutdown(); }
  }
  function safeStorageSet(obj) {
    if (!extensionAlive()) return;
    try { chrome.storage.sync.set(obj); } catch (e) { shutdown(); }
  }

  // Only ever touch the "For You" home feed. Anywhere else — Following tab,
  // profiles, search, individual posts, notifications — the extension does
  // nothing at all. X is a SPA, so every scan re-checks this.
  function onHome() {
    return location.pathname === "/home";
  }
  // The home page has two tabs ("For You" / "Following"), both at /home.
  // Only filter when the "For You" tab is the selected one.
  function onForYou() {
    if (!onHome()) return false;
    const tabs = document.querySelectorAll('[role="tab"]');
    for (const tab of tabs) {
      if (tab.getAttribute("aria-selected") === "true") {
        const label = (tab.innerText || "").trim().toLowerCase();
        return label.includes("for you");
      }
    }
    // If we can't read the tabs yet, don't assume — stay off until we can.
    return false;
  }
  function onFilterablePage() {
    return onForYou();
  }

  function normalizedKeywords() {
    return state.keywords.map(k => String(k).toLowerCase().trim()).filter(Boolean);
  }

  // Build word-boundary matchers instead of plain substring search. This stops
  // false positives like "atc" matching inside "WATCH", or "apu" inside
  // "Singapure". A keyword matches only when it stands as its own token,
  // bounded by non-alphanumeric characters (spaces, punctuation, start/end).
  // Multi-word phrases ("air india") and hyphenated types ("su-30", "f-16")
  // and numeric types ("737") all work correctly under this rule.
  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  function buildMatchers(list) {
    return list.map(k => new RegExp("(?<![a-z0-9])" + escapeRegExp(k) + "(?![a-z0-9])", "i"));
  }
  let KW = normalizedKeywords();
  let MATCHERS = buildMatchers(KW);

  function isAviation(text) {
    const t = text || "";
    return MATCHERS.some(re => re.test(t));
  }

  function applyHidden(post) {
    if (state.fullyRemove) {
      post.style.display = "none";
    } else {
      post.style.opacity = "0.06";
      post.style.filter = "grayscale(1)";
      post.style.maxHeight = "0px";
      post.style.overflow = "hidden";
      post.style.pointerEvents = "none";
    }
    post.setAttribute(ATTR, "hidden");
  }

  function clearHidden(post) {
    post.style.opacity = "";
    post.style.filter = "";
    post.style.maxHeight = "";
    post.style.overflow = "";
    post.style.pointerEvents = "";
    post.style.display = "";
    post.removeAttribute(ATTR);
  }

  /* ---- observer control: pause while we mutate the DOM ourselves ----
   * X builds its entire UI dynamically. If our own DOM writes (styles,
   * attributes, badge) keep waking the observer, we re-scan forever and the
   * page never finishes rendering. So we disconnect around our writes and
   * debounce scans. */
  let observer = null;
  let scanScheduled = false;

  function pauseObserver() {
    if (observer) observer.disconnect();
  }
  function resumeObserver() {
    if (observer) {
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  function recount() {
    state.kept = document.querySelectorAll('article[' + ATTR + '="kept"]').length;
    state.hidden = document.querySelectorAll('article[' + ATTR + '="hidden"]').length;
  }

  // Returns the element that actually scrolls the timeline.
  function scroller() {
    return document.scrollingElement || document.documentElement;
  }

  // Anchor: keep the same on-screen content stable while we collapse posts.
  // We pick the first post whose top is at/below the current viewport top,
  // remember where it sits relative to the viewport, then after mutating we
  // restore the scroll so that post stays put. This prevents the "I ended up
  // in the middle" drift caused by collapsing posts above the viewport.
  function pickAnchor() {
    const posts = document.querySelectorAll("article");
    for (const post of posts) {
      const top = post.getBoundingClientRect().top;
      if (top >= 0) return { post, top };
    }
    return null;
  }
  function restoreAnchor(anchor) {
    if (!anchor || !anchor.post.isConnected) return;
    const newTop = anchor.post.getBoundingClientRect().top;
    const delta = newTop - anchor.top;
    if (Math.abs(delta) > 0.5) {
      scroller().scrollTop += delta;
    }
  }

  function scan() {
    if (!state.enabled) return;
    if (!onFilterablePage()) { unfilterAll(); return; }
    pauseObserver();
    const anchor = pickAnchor();
    try {
      const posts = document.querySelectorAll("article");
      posts.forEach(post => {
        if (post.getAttribute(ATTR)) return; // already decided
        const text = post.innerText || "";
        if (isAviation(text)) {
          post.setAttribute(ATTR, "kept");
        } else {
          applyHidden(post);
        }
      });
      recount();
      updateBadge();
    } finally {
      restoreAnchor(anchor);
      resumeObserver();
    }
  }

  // Debounced scan: coalesce bursts of DOM mutations into one scan.
  function scheduleScan() {
    if (scanScheduled) return;
    scanScheduled = true;
    requestAnimationFrame(() => {
      scanScheduled = false;
      scan();
    });
  }

  function unfilterAll() {
    pauseObserver();
    try {
      document.querySelectorAll("article[" + ATTR + "]").forEach(clearHidden);
      recount();
      updateBadge();
    } finally {
      resumeObserver();
    }
  }

  /* ---- badge ---- */
  let badge;
  function badgeEl() {
    if (!badge && document.body) {
      badge = document.createElement("div");
      badge.id = "avf-badge";
      badge.style.cssText =
        "position:fixed;bottom:16px;right:14px;z-index:2147483647;" +
        "background:#0d1b2a;color:#4fa3ff;font:600 12px/1 system-ui,sans-serif;" +
        "padding:9px 13px;border-radius:20px;box-shadow:0 2px 12px rgba(0,0,0,.45);" +
        "cursor:pointer;user-select:none;opacity:.94";
      badge.title = "Click to toggle the aviation filter";
      badge.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        state.enabled = !state.enabled;
        safeStorageSet({ enabled: state.enabled });
        if (state.enabled) {
          scan();
        } else {
          // Reveal everything and keep it revealed until re-enabled.
          unfilterAll();
        }
        updateBadge();
      }, true);
      document.body.appendChild(badge);
    }
    return badge;
  }
  function updateBadge() {
    const b = badgeEl();
    if (!b) return;
    // Hide the badge entirely on pages we don't filter.
    if (!onFilterablePage()) { b.style.display = "none"; return; }
    b.style.display = "";
    b.textContent = state.enabled
      ? `\u2708 Aviation \u00b7 ${state.kept} kept \u00b7 ${state.hidden} hidden`
      : "\u2708 Filter off";
    b.style.background = state.enabled ? "#0d1b2a" : "#3a2a2a";
    b.style.color = state.enabled ? "#4fa3ff" : "#ffb74d";
  }

  // Resolve the effective keyword list from stored state.
  // - keywordList: full user-editable list (takes precedence).
  // - customKeywords: legacy "extra keywords" appended to the defaults.
  function resolveKeywords(res) {
    if (Array.isArray(res.keywordList) && res.keywordList.length) {
      return res.keywordList.slice();
    }
    if (Array.isArray(res.customKeywords) && res.customKeywords.length) {
      return DEFAULT_AVIATION_KEYWORDS.concat(res.customKeywords);
    }
    return DEFAULT_AVIATION_KEYWORDS.slice();
  }

  /* ---- load state, then start ---- */
  safeStorageGet(["enabled", "fullyRemove", "customKeywords", "keywordList"], (res) => {
    if (typeof res.enabled === "boolean") state.enabled = res.enabled;
    if (typeof res.fullyRemove === "boolean") state.fullyRemove = res.fullyRemove;
    state.keywords = resolveKeywords(res);
    KW = normalizedKeywords();
    MATCHERS = buildMatchers(KW);

    observer = new MutationObserver(scheduleScan);
    scheduleScan();
    resumeObserver();

    // On a fresh page load, if we started at (or very near) the top of the
    // feed, hold the scroll pinned to the top for a short window. As posts
    // stream in and get collapsed, X's height changes would otherwise nudge
    // the view downward — this keeps a refresh landing you at the top.
    if (onFilterablePage() && scroller().scrollTop < 200) {
      const pinUntil = Date.now() + 2500;
      const pin = setInterval(() => {
        if (!extensionAlive()) { clearInterval(pin); return; }
        if (Date.now() > pinUntil) { clearInterval(pin); return; }
        // Only re-pin if drift pushed us down slightly; never fight a
        // deliberate user scroll further down the page.
        if (scroller().scrollTop > 0 && scroller().scrollTop < 600) {
          scroller().scrollTop = 0;
        }
      }, 100);
      timers.push(pin);
    }

    // Light periodic safety net (debounced), far less aggressive than before.
    timers.push(setInterval(() => {
      if (!extensionAlive()) { shutdown(); return; }
      scheduleScan();
    }, 2000));

    // Detect changes to whether we should be filtering. This covers both
    // SPA navigation (path change) and switching the home tab between
    // "For You" and "Following" (same /home path, no reload). The moment we
    // leave "For You", everything is un-filtered so there's zero interference.
    let wasFilterable = onFilterablePage();
    timers.push(setInterval(() => {
      if (!extensionAlive()) { shutdown(); return; }
      const isFilterable = onFilterablePage();
      if (isFilterable !== wasFilterable) {
        wasFilterable = isFilterable;
        pauseObserver();
        document.querySelectorAll("article[" + ATTR + "]").forEach(clearHidden);
        resumeObserver();
        if (isFilterable) scheduleScan();
        else { recount(); }
        updateBadge();
      }
    }, 400));
  });

  /* ---- react to popup changes live ---- */
  if (extensionAlive()) {
    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (!extensionAlive()) { shutdown(); return; }
        if (area !== "sync") return;
        if (changes.enabled) {
          state.enabled = changes.enabled.newValue;
          if (state.enabled) {
            pauseObserver();
            document.querySelectorAll("article[" + ATTR + "]").forEach(clearHidden);
            resumeObserver();
            scan();
          } else {
            unfilterAll();
          }
        }
        if (changes.fullyRemove) {
          state.fullyRemove = changes.fullyRemove.newValue;
          pauseObserver();
          document.querySelectorAll("article[" + ATTR + "]").forEach(clearHidden);
          resumeObserver();
          scan();
        }
        if (changes.keywordList || changes.customKeywords) {
          // Re-read both keys so precedence stays correct.
          safeStorageGet(["keywordList", "customKeywords"], (res) => {
            state.keywords = resolveKeywords(res);
            KW = normalizedKeywords();
            MATCHERS = buildMatchers(KW);
            pauseObserver();
            document.querySelectorAll("article[" + ATTR + "]").forEach(clearHidden);
            resumeObserver();
            scan();
          });
        }
      });
    } catch (e) { /* context already gone */ }
  }
})();
