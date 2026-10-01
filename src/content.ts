/* X Feed Filter (content script)
 * Hides "For You" timeline posts whose text doesn't match any of your
 * keywords. Ships with an aviation keyword preset by default.
 * State (on/off, mode, custom keywords) lives in chrome.storage.sync.
 * Depends on keywords.ts (injected first) for DEFAULT_KEYWORDS,
 * SETTINGS_KEYS and resolveKeywords.
 */
(function () {
  "use strict";

  interface FilterState {
    enabled: boolean;
    fullyRemove: boolean; // false = collapse+dim, true = display:none
    keywords: string[];
    kept: number;
    hidden: number;
  }

  interface Anchor {
    post: HTMLElement;
    top: number;
  }

  const state: FilterState = {
    enabled: true,
    fullyRemove: false,
    keywords: DEFAULT_KEYWORDS.slice(),
    kept: 0,
    hidden: 0
  };

  const ATTR = "data-avf";

  // When the extension is reloaded/updated, this old content script loses its
  // connection ("Extension context invalidated"). Detect that and shut down
  // quietly instead of throwing on every chrome.* call.
  function extensionAlive(): boolean {
    try {
      return !!(chrome.runtime && chrome.runtime.id);
    } catch (e) {
      return false;
    }
  }

  const timers: ReturnType<typeof setInterval>[] = [];
  function shutdown(): void {
    try { if (observer) observer.disconnect(); } catch (e) { /* ignore */ }
    timers.forEach(clearInterval);
    // Reveal any posts we had hidden so the page is left clean.
    try {
      allMarkedPosts().forEach(clearHidden);
    } catch (e) { /* ignore */ }
    const b = document.getElementById("avf-badge");
    if (b) b.remove();
  }

  // Safe wrappers: no-op if the extension context is gone.
  function safeStorageGet(keys: string[], cb: (res: StoredSettings) => void): void {
    if (!extensionAlive()) return;
    try { chrome.storage.sync.get(keys, (items) => cb(items as StoredSettings)); } catch (e) { shutdown(); }
  }
  function safeStorageSet(obj: StoredSettings): void {
    if (!extensionAlive()) return;
    try { chrome.storage.sync.set(obj); } catch (e) { shutdown(); }
  }

  // Only ever touch the "For You" home feed. Anywhere else — Following tab,
  // profiles, search, individual posts, notifications — the extension does
  // nothing at all. X is a SPA, so every scan re-checks this.
  function onHome(): boolean {
    return location.pathname === "/home";
  }
  // The home page has two tabs ("For You" / "Following"), both at /home.
  // Only filter when the "For You" tab is the selected one.
  function onForYou(): boolean {
    if (!onHome()) return false;
    const tabs = document.querySelectorAll<HTMLElement>('[role="tab"]');
    for (const tab of Array.from(tabs)) {
      if (tab.getAttribute("aria-selected") === "true") {
        const label = (tab.innerText || "").trim().toLowerCase();
        return label.includes("for you");
      }
    }
    // If we can't read the tabs yet, don't assume — stay off until we can.
    return false;
  }
  function onFilterablePage(): boolean {
    return onForYou();
  }

  function allMarkedPosts(): HTMLElement[] {
    return Array.from(document.querySelectorAll<HTMLElement>("article[" + ATTR + "]"));
  }

  function normalizedKeywords(): string[] {
    return state.keywords.map(k => String(k).toLowerCase().trim()).filter(Boolean);
  }

  // Build word-boundary matchers instead of plain substring search. This stops
  // false positives like "atc" matching inside "WATCH", or "apu" inside
  // "Singapure". A keyword matches only when it stands as its own token,
  // bounded by non-alphanumeric characters (spaces, punctuation, start/end).
  // Multi-word phrases ("air india") and hyphenated types ("su-30", "f-16")
  // and numeric types ("737") all work correctly under this rule.
  function escapeRegExp(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  function buildMatchers(list: string[]): RegExp[] {
    return list.map(k => new RegExp("(?<![a-z0-9])" + escapeRegExp(k) + "(?![a-z0-9])", "i"));
  }
  let MATCHERS: RegExp[] = buildMatchers(normalizedKeywords());

  function setKeywords(list: string[]): void {
    state.keywords = list;
    MATCHERS = buildMatchers(normalizedKeywords());
  }

  function matchesKeywords(text: string): boolean {
    const t = text || "";
    return MATCHERS.some(re => re.test(t));
  }

  function applyHidden(post: HTMLElement): void {
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

  function clearHidden(post: HTMLElement): void {
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
  let observer: MutationObserver | null = null;
  let scanScheduled = false;

  function pauseObserver(): void {
    if (observer) observer.disconnect();
  }
  function resumeObserver(): void {
    if (observer) {
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  // Un-hide everything we touched, without waking our own observer.
  function clearAllMarks(): void {
    pauseObserver();
    try {
      allMarkedPosts().forEach(clearHidden);
    } finally {
      resumeObserver();
    }
  }

  function recount(): void {
    state.kept = document.querySelectorAll('article[' + ATTR + '="kept"]').length;
    state.hidden = document.querySelectorAll('article[' + ATTR + '="hidden"]').length;
  }

  // Returns the element that actually scrolls the timeline.
  function scroller(): Element {
    return document.scrollingElement || document.documentElement;
  }

  // Anchor: keep the same on-screen content stable while we collapse posts.
  // We pick the first post whose top is at/below the current viewport top,
  // remember where it sits relative to the viewport, then after mutating we
  // restore the scroll so that post stays put. This prevents the "I ended up
  // in the middle" drift caused by collapsing posts above the viewport.
  function pickAnchor(): Anchor | null {
    const posts = document.querySelectorAll<HTMLElement>("article");
    for (const post of Array.from(posts)) {
      const top = post.getBoundingClientRect().top;
      if (top >= 0) return { post, top };
    }
    return null;
  }
  function restoreAnchor(anchor: Anchor | null): void {
    if (!anchor || !anchor.post.isConnected) return;
    const newTop = anchor.post.getBoundingClientRect().top;
    const delta = newTop - anchor.top;
    if (Math.abs(delta) > 0.5) {
      scroller().scrollTop += delta;
    }
  }

  function scan(): void {
    if (!state.enabled) return;
    if (!onFilterablePage()) { unfilterAll(); return; }
    pauseObserver();
    const anchor = pickAnchor();
    try {
      const posts = document.querySelectorAll<HTMLElement>("article");
      posts.forEach(post => {
        if (post.getAttribute(ATTR)) return; // already decided
        const text = post.innerText || "";
        if (matchesKeywords(text)) {
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
  function scheduleScan(): void {
    if (scanScheduled) return;
    scanScheduled = true;
    requestAnimationFrame(() => {
      scanScheduled = false;
      scan();
    });
  }

  function unfilterAll(): void {
    pauseObserver();
    try {
      allMarkedPosts().forEach(clearHidden);
      recount();
      updateBadge();
    } finally {
      resumeObserver();
    }
  }

  // Clear all decisions and re-run the filter from scratch.
  function rescan(): void {
    clearAllMarks();
    scan();
  }

  /* ---- badge ---- */
  let badge: HTMLDivElement | undefined;
  function badgeEl(): HTMLDivElement | undefined {
    if (!badge && document.body) {
      const el = document.createElement("div");
      el.id = "avf-badge";
      el.style.cssText =
        "position:fixed;bottom:16px;right:14px;z-index:2147483647;" +
        "background:#0d1b2a;color:#4fa3ff;font:600 12px/1 system-ui,sans-serif;" +
        "padding:9px 13px;border-radius:20px;box-shadow:0 2px 12px rgba(0,0,0,.45);" +
        "cursor:pointer;user-select:none;opacity:.94";
      el.title = "Click to toggle the feed filter";
      el.setAttribute("role", "button");
      el.addEventListener("click", (e) => {
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
      document.body.appendChild(el);
      badge = el;
    }
    return badge;
  }
  function updateBadge(): void {
    const b = badgeEl();
    if (!b) return;
    // Hide the badge entirely on pages we don't filter.
    if (!onFilterablePage()) { b.style.display = "none"; return; }
    b.style.display = "";
    b.textContent = state.enabled
      ? `Feed filter \u00b7 ${state.kept} kept \u00b7 ${state.hidden} hidden`
      : "Feed filter off";
    b.style.background = state.enabled ? "#0d1b2a" : "#3a2a2a";
    b.style.color = state.enabled ? "#4fa3ff" : "#ffb74d";
  }

  /* ---- load state, then start ---- */
  safeStorageGet(SETTINGS_KEYS, (res) => {
    if (typeof res.enabled === "boolean") state.enabled = res.enabled;
    if (typeof res.fullyRemove === "boolean") state.fullyRemove = res.fullyRemove;
    setKeywords(resolveKeywords(res));

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
        clearAllMarks();
        if (isFilterable) scheduleScan();
        else recount();
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
          state.enabled = changes.enabled.newValue as boolean;
          if (state.enabled) rescan();
          else unfilterAll();
        }
        if (changes.fullyRemove) {
          state.fullyRemove = changes.fullyRemove.newValue as boolean;
          rescan();
        }
        if (changes.keywordList || changes.customKeywords) {
          // Re-read both keys so precedence stays correct.
          safeStorageGet(["keywordList", "customKeywords"], (res) => {
            setKeywords(resolveKeywords(res));
            rescan();
          });
        }
      });
    } catch (e) { /* context already gone */ }
  }
})();
