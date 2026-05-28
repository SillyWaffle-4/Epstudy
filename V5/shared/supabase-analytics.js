(function () {
  const CONFIG = {
    // Paste your Supabase Project URL here, for example:
    // "https://your-project-ref.supabase.co"
    url: "",

    // Paste your Supabase anon/public key here.
    // Never paste the service_role key into a website or extension file.
    anonKey: ""
  };

  const SESSION_KEY = "epstudy_analytics_session_v1";

  function cleanText(value, fallback = "") {
    return String(value || fallback)
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120);
  }

  function isConfigured() {
    return Boolean(CONFIG.url && CONFIG.anonKey && /^https:\/\/.+\.supabase\.co\/?$/i.test(CONFIG.url.trim()));
  }

  function sessionId() {
    try {
      let existing = localStorage.getItem(SESSION_KEY);
      if (!existing) {
        existing = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        localStorage.setItem(SESSION_KEY, existing);
      }
      return existing;
    } catch {
      return `session-${Date.now()}`;
    }
  }

  function endpoint() {
    return `${CONFIG.url.replace(/\/+$/, "")}/rest/v1/feature_events`;
  }

  function log(eventName, options = {}) {
    if (!isConfigured()) return Promise.resolve({ skipped: true, reason: "not_configured" });
    const metadata = options.metadata && typeof options.metadata === "object" ? options.metadata : {};
    const payload = {
      app: cleanText(options.app, "normal").slice(0, 40),
      page: cleanText(options.page || location.pathname || "", "").slice(0, 80) || null,
      event_name: cleanText(eventName, "feature_event").slice(0, 80),
      session_id: sessionId(),
      metadata
    };

    return fetch(endpoint(), {
      method: "POST",
      keepalive: true,
      headers: {
        apikey: CONFIG.anonKey,
        Authorization: `Bearer ${CONFIG.anonKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify(payload)
    }).catch(() => {});
  }

  window.EPSTUDY_SUPABASE_LOGGING = CONFIG;
  window.EPSTUDY_ANALYTICS = { log, isConfigured };
})();
