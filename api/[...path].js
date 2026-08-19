module.exports = async (req, res) => {
  const { default: app } = await import("../artifacts/api-server/dist/index.mjs");
  
  // Debug temporal: mostrar la URL que recibe Express
  console.log("req.url original:", req.url);
  console.log("req.originalUrl:", req.originalUrl);
  
  req.url = req.url.startsWith("/api") ? req.url : "/api" + req.url;
  
  console.log("req.url modificado:", req.url);
  
  return app(req, res);
};
