module.exports = async (req, res) => {
  const { default: app } = await import("../artifacts/api-server/dist/index.mjs");

  // Vercel removes /api before invoking this catch-all Function.
  // Restore it because the bundled Express app mounts its routes at /api.
  req.url = "/api" + (req.url === "/" ? "" : req.url);

  return app(req, res);
};
