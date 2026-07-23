import rateLimit from "express-rate-limit";

/**
 * Strict limiter for sensitive write endpoints:
 * POST /payments/create and POST /users — 10 requests per 10 minutes per IP.
 */
export const strictLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

/**
 * Feedback limiter: POST /feedback — 5 submissions per 15 minutes per IP.
 */
export const feedbackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados mensajes enviados. Esperá 15 minutos e intentá de nuevo." },
});

/**
 * Relaxed limiter for high-frequency endpoints:
 * POST /breaks — 60 requests per minute per IP.
 */
export const relaxedLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
