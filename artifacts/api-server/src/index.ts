import app from "./app";

// The Vercel Functions layer imports this module after it has been bundled by
// build.mjs. Keeping the app separate from the listener makes it reusable in
// serverless environments.
export default app;
