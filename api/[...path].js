module.exports = async (req, res) => {
  const { default: app } = await import("../artifacts/api-server/dist/index.mjs");
  req.url = "/api" + (req.url === "/" ? "" : req.url);
  return app(req, res);
};
