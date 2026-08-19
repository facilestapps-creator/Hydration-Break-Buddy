import cookieParser from "cookie-parser";
import cors from "cors";
import express, {
  type Request,
  type RequestHandler,
  type Response,
  type Router,
} from "express";
import pinoHttp from "pino-http";
import { logger } from "../artifacts/api-server/src/lib/logger";

const ALLOWED_ORIGIN = "https://breakbuddy.facilest.com";

/**
 * Adapts an existing Express router to a Vercel Node.js Function.
 * Routers remain the single source of truth during the Replit → Vercel transition.
 */
export function createApiHandler(router: Router): RequestHandler {
  const app = express();

  app.set("trust proxy", 1);
  app.use(
    pinoHttp({
      logger,
      serializers: {
        req(req: Request) {
          return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
        },
        res(res: Response) {
          return { statusCode: res.statusCode };
        },
      },
    }),
  );
  app.use(
    cors({
      origin(
        origin: string | undefined,
        callback: (error: Error | null, allow?: boolean) => void,
      ) {
        // Vercel/MP server-to-server calls do not include Origin.
        if (!origin || origin === ALLOWED_ORIGIN) {
          callback(null, true);
          return;
        }
        callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "100kb" }));
  app.use(express.urlencoded({ extended: true, limit: "100kb" }));

  // Vercel supplies the original /api/... path to the function, so retaining
  // this mount point lets the legacy routers keep their existing route paths.
  app.use("/api", router);

  return app;
}
