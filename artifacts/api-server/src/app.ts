import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

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

// Derive the allowed origin: explicit env var wins, then try REPLIT_DOMAINS,
// then fall back to null (same-origin requests still work without CORS headers).
const primaryAllowedOrigin =
  process.env.ALLOWED_ORIGIN ??
  (process.env.REPLIT_DOMAINS
    ? `https://${process.env.REPLIT_DOMAINS.split(",")[0].trim()}`
    : null);

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
      // Explicit allowed origin.
      if (primaryAllowedOrigin && origin === primaryAllowedOrigin) {
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
