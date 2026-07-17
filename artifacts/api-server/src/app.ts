import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Trust the first proxy hop so express-rate-limit can read X-Forwarded-For
// correctly in production (Replit's reverse proxy sets this header).
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Build the set of allowed origins from:
//  1. ALLOWED_ORIGIN env var (comma-separated list, e.g. "https://sipwell.app")
//  2. REPLIT_DOMAINS env var (comma-separated, added automatically by Replit)
// Both are included so the app works under a custom domain AND the Replit-assigned URL.
const allowedOrigins = new Set<string>();
if (process.env.ALLOWED_ORIGIN) {
  process.env.ALLOWED_ORIGIN.split(",").map(o => o.trim()).filter(Boolean).forEach(o => allowedOrigins.add(o));
}
if (process.env.REPLIT_DOMAINS) {
  process.env.REPLIT_DOMAINS.split(",").map(d => d.trim()).filter(Boolean).forEach(d => allowedOrigins.add(`https://${d}`));
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Requests with no origin header (same-origin, curl, server-to-server) → allow.
      if (!origin) return callback(null, true);
      // Localhost always allowed in development.
      if (
        process.env.NODE_ENV === "development" &&
        /^https?:\/\/localhost(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }
      // Any configured origin (custom domain + Replit domain).
      if (allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
