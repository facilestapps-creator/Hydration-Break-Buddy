let app = null;
let appError = null;

module.exports = async (req, res) => {
  try {
    if (!app && !appError) {
      console.log("[API] Loading backend...");
      const { default: loadedApp } = await import("./dist/index.mjs");
      app = loadedApp;
      console.log("[API] Backend loaded successfully");
    }

    if (appError) {
      return res.status(500).json({ 
        error: "Backend failed to load", 
        details: appError.message 
      });
    }

    const originalUrl = req.url;
    req.url = req.url.startsWith("/api") ? req.url : "/api" + req.url;
    
    console.log(`[API] ${req.method} ${originalUrl} → ${req.url}`);
    
    return app(req, res);
    
  } catch (err) {
    console.error("[API] Critical error:", err);
    appError = err;
    return res.status(500).json({ 
      error: "Internal server error",
      message: err.message 
    });
  }
};
