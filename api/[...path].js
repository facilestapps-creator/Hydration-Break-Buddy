let app = null;
let appError = null;
let loadAttempts = 0;
const MAX_RETRIES = 2;

// Intentar resolver el path del backend en diferentes ubicaciones
function resolveBackendPath() {
  const paths = [
    "../artifacts/api-server/dist/index.mjs",           // Desde api/
    "./artifacts/api-server/dist/index.mjs",            // Desde root
    "/var/task/artifacts/api-server/dist/index.mjs",    // Vercel runtime
  ];
  
  for (const p of paths) {
    try {
      require.resolve(p);
      return p;
    } catch {
      continue;
    }
  }
  return paths[0]; // fallback
}

module.exports = async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Cachear la app para no re-importar en cada request
    if (!app && !appError && loadAttempts < MAX_RETRIES) {
      loadAttempts++;
      const backendPath = resolveBackendPath();
      console.log(`[API] Loading backend from: ${backendPath} (attempt ${loadAttempts})`);
      
      const { default: loadedApp } = await import(backendPath);
      app = loadedApp;
      console.log(`[API] Backend loaded in ${Date.now() - startTime}ms`);
    }

    if (appError) {
      console.error("[API] Backend failed to load previously:", appError.message);
      return res.status(500).json({ 
        error: "Backend failed to initialize", 
        details: appError.message 
      });
    }

    if (!app) {
      return res.status(503).json({ 
        error: "Backend is starting, please retry in a few seconds" 
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
      message: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined
    });
  }
};
