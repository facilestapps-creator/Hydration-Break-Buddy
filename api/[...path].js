module.exports = async (req, res) => {
  const { default: app } = await import("../artifacts/api-server/dist/index.mjs");
  return app(req, res);
};
