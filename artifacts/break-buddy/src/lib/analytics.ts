const SESSION_KEY = "bb-session-id";
const PING_INTERVAL_MS = 20_000;
const PING_URL = `${import.meta.env.BASE_URL}api/analytics/ping`.replace(/\/\//g, "/");

function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

async function sendPing(): Promise<void> {
  try {
    await fetch(PING_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: getSessionId() }),
      keepalive: true,
    });
  } catch {
    // Silent — analytics failures must never surface to the user
  }
}

function sendBeacon(): void {
  try {
    const blob = new Blob(
      [JSON.stringify({ sessionId: getSessionId() })],
      { type: "application/json" },
    );
    navigator.sendBeacon(PING_URL, blob);
  } catch {
    // Silent
  }
}

let intervalId: ReturnType<typeof setInterval> | null = null;

function startInterval(): void {
  if (intervalId !== null) return;
  intervalId = setInterval(() => {
    if (!document.hidden) sendPing();
  }, PING_INTERVAL_MS);
}

function stopInterval(): void {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

/**
 * Call once at app mount. Sends an initial ping, starts the heartbeat interval,
 * pauses when the tab is hidden, resumes when visible, and fires a beacon on unload.
 */
export function initAnalytics(): void {
  // Initial ping
  sendPing();

  // Heartbeat interval — only while tab is visible
  if (!document.hidden) startInterval();

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopInterval();
    } else {
      sendPing();
      startInterval();
    }
  });

  // Best-effort final ping on tab close
  window.addEventListener("pagehide", sendBeacon);
}
