import { useRef, useCallback } from "react";

// Singleton AudioContext — created once, reused across all alerts.
// Avoids hitting browser limits from repeated new AudioContext() calls.
let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedCtx) sharedCtx = new Ctor();
  return sharedCtx;
}

export function useAudio() {
  const resumedRef = useRef(false);

  // Call this on any user gesture so the context is allowed to play sound
  const resumeContext = useCallback(async () => {
    const ctx = getAudioContext();
    if (!ctx || resumedRef.current) return;
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    resumedRef.current = true;
  }, []);

  const playNotificationSound = useCallback(async () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      // Resume in case user hasn't interacted yet (best-effort)
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      const playBeep = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);

        gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
        gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + startTime);
        osc.stop(ctx.currentTime + startTime + duration + 0.05);
      };

      // Cheerful ascending chime: C5 → E5 → G5
      playBeep(523.25, 0, 0.2);
      playBeep(659.25, 0.15, 0.2);
      playBeep(783.99, 0.3, 0.4);
    } catch {
      // Audio unavailable — silent fallback, break modal still opens normally
    }
  }, []);

  return { playNotificationSound, resumeContext };
}
