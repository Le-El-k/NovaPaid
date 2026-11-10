import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const CLIENT_DIST = path.join(__dirname, "dist", "client");
const PUBLIC_DIR = path.join(__dirname, "public");
const CLIENT_PAGE_ROUTES = new Set([
  "admin", "bloodstrike", "boutique", "boutique/connexion-internet", "boutique/jeux-video", "boutique/pieces-tiktok", "cards", "cod", "dashboard", "dashboard/boutique", "fcmobile",
  "forgot-password", "fortnite", "freefire", "funding", "games", "help", "history", "login", "marketplace",
  "my-shop", "notifications", "payment", "payment/failed", "payment/failure", "payment/success",
  "privacy", "profile", "pubg", "register", "reseller", "reset-password", "settings", "shop", "support",
  "terms", "transactions", "transfers", "verify-code", "verify-email", "wallet",
]);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};

// Import dynamique des routes API
async function loadApiHandler(endpoint) {
  switch (endpoint) {
    case "wallet":
      return await import("./app/api/wallet/route.ts");
    case "cards":
      return await import("./app/api/cards/route.ts");
    case "transfers":
      return await import("./app/api/transfers/route.ts");
    case "transactions":
      return await import("./app/api/transactions/route.ts");
    case "admin":
      return await import("./app/api/admin/route.ts");
    case "auth":
      return await import("./app/api/auth/route.ts");
    case "auth/password-reset":
      return await import("./app/api/auth/password-reset/route.ts");
    case "auth/verify":
      return await import("./app/api/auth/verify/route.ts");
    case "admin/fees":
      return await import("./app/api/admin/fees/route.ts");
    case "fees":
      return await import("./app/api/fees/route.ts");
    case "marketplace":
      return await import("./app/api/marketplace/route.ts");
    case "reviews":
      return await import("./app/api/reviews/route.ts");
    case "profile":
      return await import("./app/api/profile/route.ts");
    case "support":
      return await import("./app/api/support/route.ts");
    case "notifications":
      return await import("./app/api/notifications/route.ts");
    case "platform-status":
      return await import("./app/api/platform-status/route.ts");
    case "shops":
      return await import("./app/api/shops/route.ts");
    case "shop-catalog":
      return await import("./app/api/shop-catalog/route.ts");
    case "resellers":
      return await import("./app/api/resellers/route.ts");
    case "ads":
      return await import("./app/api/ads/route.ts");
    default:
      return null;
  }
}

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = decodeURIComponent(urlObj.pathname);

  if (
    pathname === "/portal-prive-gestion" ||
    pathname.startsWith("/portal-prive-gestion/") ||
    pathname === "/portal-prive-gestion.html" ||
    pathname === "/novapaid-control-center-2026"
  ) {
    res.writeHead(308, { Location: "/admin", "Cache-Control": "no-store" });
    res.end();
    return;
  }

  // 1. GESTION DES REQUÊTES API (/api/...)
  if (pathname.startsWith("/api/")) {
    const apiPath = pathname.replace(/^\/api\//, "").replace(/\/+$/, "");
    // Essayer d'abord le chemin complet (ex: auth/password-reset), puis le premier segment
    const endpointCandidates = [apiPath, apiPath.split("/")[0]];

    try {
      let handlerModule = null;
      for (const candidate of endpointCandidates) {
        handlerModule = await loadApiHandler(candidate);
        if (handlerModule) break;
      }
      if (!handlerModule) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: "Route API introuvable" }));
        return;
      }

      // Lire le body si méthode POST / PUT / PATCH
      let bodyData = null;
      if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
        const chunks = [];
        for await (const chunk of req) {
          chunks.push(chunk);
        }
        const rawBody = Buffer.concat(chunks).toString("utf-8");
        try {
          bodyData = rawBody ? JSON.parse(rawBody) : {};
        } catch {
          bodyData = {};
        }
      }

      // Créer une Request Web standard pour le Route Handler Next.js
      const webReq = new Request(urlObj.toString(), {
        method: req.method,
        headers: req.headers,
        body: bodyData ? JSON.stringify(bodyData) : undefined,
      });

      let webRes;
      if (req.method === "GET" && handlerModule.GET) {
        webRes = await handlerModule.GET(webReq);
      } else if (req.method === "POST" && handlerModule.POST) {
        webRes = await handlerModule.POST(webReq);
      } else {
        res.writeHead(405, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: "Méthode non autorisée" }));
        return;
      }

      const resHeaders = {};
      webRes.headers.forEach((val, key) => {
        resHeaders[key] = val;
      });

      res.writeHead(webRes.status || 200, resHeaders);
      const resBody = await webRes.text();
      res.end(resBody);
      return;
    } catch (err) {
      console.error("[API Error]", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: err?.message || "Erreur interne" }));
      return;
    }
  }

  // 1.5. INTERCEPTEUR DE MODULES CLIENTS DYNAMIQUES
  if (pathname.includes("VirtualCardsSection")) {
    res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8" });
    res.end('import{r as VirtualCardsSection}from"/_next/static/chunks/BoutiqueExperience-Dg-QGXUa.js";export{VirtualCardsSection};export default VirtualCardsSection;');
    return;
  }

  // 2. FICHIERS DU DOSSIER APP OU MODULES LOCAUX
  if (pathname.startsWith("/app/")) {
    let candidatePath = path.join(__dirname, pathname);
    let resolved = null;
    const extensionsToTry = ["", ".tsx", ".ts", ".jsx", ".js", ".mjs", ".css"];
    for (const ext of extensionsToTry) {
      const p = candidatePath + ext;
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        resolved = p;
        break;
      }
    }
    if (resolved) {
      const ext = path.extname(resolved).toLowerCase();
      const mime = ext === ".css" ? "text/css; charset=utf-8" : "application/javascript; charset=utf-8";
      res.writeHead(200, { "Content-Type": mime });
      fs.createReadStream(resolved).pipe(res);
      return;
    }
  }

  // 3. FICHIERS STATIQUES (dist/client ou public)
  let filePath = path.join(CLIENT_DIST, pathname);
  let fileFound = fs.existsSync(filePath) && fs.statSync(filePath).isFile();

  if (!fileFound) {
    filePath = path.join(PUBLIC_DIR, pathname);
    fileFound = fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  }

  if (fileFound) {
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": mime,
      "Cache-Control": "no-cache, no-store, must-revalidate",
    });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // 4. PAGES CLIENTS SPA ET ROUTAGE PROPRE (URLS FORMATÉES)
  const isAssetRequest = pathname.includes(".") || pathname.startsWith("/_next/") || pathname.startsWith("/api/");
  if (!isAssetRequest) {
    // Si URL racine "/" -> Servir la LANDING PAGE OFFICIELLE !
    if (pathname === "/" || pathname === "" || pathname === "/landing") {
      const landingPath = path.join(CLIENT_DIST, "landing.html");
      if (fs.existsSync(landingPath)) {
        res.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        });
        fs.createReadStream(landingPath).pipe(res);
        return;
      }
    }

    // Les pages issues du build sont exportées dans leur propre dossier.
    if (pathname === "/login" || pathname === "/login/") {
      const loginPath = path.join(CLIENT_DIST, "login", "index.html");
      if (fs.existsSync(loginPath)) {
        res.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        });
        fs.createReadStream(loginPath).pipe(res);
        return;
      }
    }
    if (pathname === "/register" || pathname === "/register/") {
      const registerPath = path.join(CLIENT_DIST, "register", "index.html");
      if (fs.existsSync(registerPath)) {
        res.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        });
        fs.createReadStream(registerPath).pipe(res);
        return;
      }
    }

    // L’administration utilise la connexion e-mail/mot de passe de /api/admin.
    // Le serveur sert la même console à /admin; l’autorisation reste vérifiée par l’API.
    if (pathname === "/admin" || pathname === "/admin/") {
      const adminPath = path.join(CLIENT_DIST, "admin", "index.html");
      if (fs.existsSync(adminPath)) {
        res.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        });
        fs.createReadStream(adminPath).pipe(res);
        return;
      }
      res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
      res.end("Console d’administration indisponible.");
      return;
    }

    // Dynamic user shop routes: /shop/<slug> → serve shop/index.html (client reads slug from URL)
    if (pathname.startsWith("/shop/") && pathname.split("/").length === 3) {
      const shopPagePath = path.join(CLIENT_DIST, "shop", "index.html");
      if (fs.existsSync(shopPagePath)) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache, no-store, must-revalidate" });
        fs.createReadStream(shopPagePath).pipe(res);
        return;
      }
    }

    const routeName = pathname.replace(/^\/+|\/+$/g, "");
    if (CLIENT_PAGE_ROUTES.has(routeName)) {
      const pagePath = path.join(CLIENT_DIST, routeName, "index.html");
      if (fs.existsSync(pagePath) && fs.statSync(pagePath).isFile()) {
        res.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        });
        fs.createReadStream(pagePath).pipe(res);
        return;
      }
    }
  } else {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 Not Found");
    return;
  }

  // Si aucun build disponible
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(`
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="utf-8">
        <title>NovaPaid - Serveur Opérationnel</title>
        <style>
          body { font-family: -apple-system, sans-serif; background: #0f172a; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
          .card { background: #1e293b; padding: 40px; border-radius: 16px; border: 1px solid #334155; max-width: 480px; }
          h1 { color: #38bdf8; margin-top: 0; }
          a { color: #38bdf8; text-decoration: none; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>🚀 NovaPaid en Ligne</h1>
          <p>Le backend et la base de données locale sont 100% actifs.</p>
          <p><a href="/api/wallet">Tester l'API Portefeuille</a> • <a href="/api/admin?section=overview">Console Admin API</a></p>
        </div>
      </body>
    </html>
  `);
});

server.listen(PORT, () => {
  console.log("==================================================");
  console.log(`🚀 NOVAPAID SERVEUR ACTIF SUR LE PORT ${PORT}`);
  console.log(`📍 Accès Landing & Client    : http://localhost:${PORT}`);
  console.log(`🛡️ Console Admin             : http://localhost:${PORT}/admin`);
  console.log("🔐 Accès admin protégé par e-mail, mot de passe et session HttpOnly.");
  console.log("💾 Stockage local de développement initialisé.");
  console.log("==================================================");
});
