import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load runtime server secrets from local (git-ignored) env files so that keys
// such as GENY_API_KEY are available via process.env without ever living in the
// committed repository. Existing process.env values always win.
function loadEnvFile(relativePath) {
  try {
    const full = path.join(__dirname, relativePath);
    if (!fs.existsSync(full)) return;
    const content = fs.readFileSync(full, "utf-8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 1) continue;
      const key = line.slice(0, eq).trim();
      if (key in process.env) continue;
      let value = line.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  } catch {
    // Env file loading is best-effort; never block startup on it.
  }
}
loadEnvFile(".env.geny.local");
loadEnvFile(".env.admin.local");
loadEnvFile(".env.maplerad.local");
loadEnvFile(".env.soleaspay.local");
loadEnvFile(".env.bkpay.local");
loadEnvFile(".env.mailjet.local");

const PORT = process.env.PORT || 3000;
const CLIENT_DIST = path.join(__dirname, "dist", "client");
const PUBLIC_DIR = path.join(__dirname, "public");
const CLIENT_PAGE_ROUTES = new Set([
  "admin", "bloodstrike", "boutique", "boutique/connexion-internet", "boutique/jeux-video", "boutique/pieces-tiktok", "cards", "cod", "dashboard", "dashboard/boutique", "fcmobile",
  "forgot-password", "fortnite", "freefire", "funding", "games", "help", "history", "login", "marketplace",
  "my-shop", "notifications", "payment", "payment/failed", "payment/failure", "payment/success",
  "privacy", "profile", "pubg", "register", "reseller", "reset-password", "security", "settings", "shop", "support",
  "terms", "transactions", "transfers", "verify-code", "verify-email", "wallet",
]);

// Pages servables SANS session utilisateur. Tout le reste exige une connexion.
// /admin est "public" ici mais reste protégé par sa propre session admin.
const PUBLIC_PAGE_PATHS = new Set([
  "/", "/landing",
  "/login", "/register",
  "/forgot-password", "/reset-password",
  "/verify-code", "/verify-email",
  "/admin",
]);

function isPublicPagePath(pathname) {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return PUBLIC_PAGE_PATHS.has(normalized);
}

// Pour un fichier statique "page" (index.html, *.html, ou charge utile RSC *.txt),
// retourne la route logique correspondante ; sinon null (JS/CSS/images restent publics).
function pagePayloadRoute(pathname) {
  if (pathname.endsWith("/index.html") || pathname.endsWith("/index.txt")) {
    return pathname.replace(/\/index\.(html|txt)$/, "") || "/";
  }
  if (pathname.endsWith(".txt")) {
    return path.dirname(pathname) || "/";
  }
  if (pathname.endsWith(".html")) {
    return pathname.replace(/\.html$/, "") || "/";
  }
  return null;
}

// Chargé une seule fois, puis réutilisé pour valider le cookie de session.
let authModulePromise = null;
async function getUserFromRequest(req, urlObj) {
  try {
    if (!authModulePromise) authModulePromise = import("./app/lib/auth/session.ts");
    const { getAuthenticatedUser } = await authModulePromise;
    const headers = new Headers();
    if (req.headers.cookie) headers.set("cookie", req.headers.cookie);
    const webReq = new Request(urlObj.toString(), { headers });
    return getAuthenticatedUser(webReq);
  } catch {
    return null;
  }
}

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

// Confine un chemin de requête à un dossier de base et REFUSE toute traversée
// (../, séquences encodées %2e%2e%2f / ..%2f, etc. une fois décodées). Retourne
// un chemin absolu garanti à l'intérieur de baseDir, ou null si la requête tente
// d'en sortir. Sans ce verrou, `/..%2f..%2f.env.soleaspay.local` ou
// `/..%2f..%2fnovapaid_app.db` permettraient de lire secrets et base de données.
function safeResolve(baseDir, requestPath) {
  const resolvedBase = path.resolve(baseDir);
  const target = path.resolve(resolvedBase, "." + path.sep + requestPath);
  const rel = path.relative(resolvedBase, target);
  if (rel && (rel.startsWith("..") || path.isAbsolute(rel))) return null;
  return target;
}

// En-têtes de durcissement appliqués à CHAQUE réponse. Le serveur Node de
// production (npm start) ne lit pas public/_headers (ce fichier n'est honoré que
// par Cloudflare Pages), ces en-têtes doivent donc être posés ici.
function applySecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Content-Security-Policy", "frame-ancestors 'none'");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  }
}

// Import dynamique des routes API
async function loadApiHandler(endpoint) {
  switch (endpoint) {
    case "wallet":
      return await import("./api-routes/wallet/route.ts");
    case "cards":
      return await import("./api-routes/cards/route.ts");
    case "transfers":
      return await import("./api-routes/transfers/route.ts");
    case "transactions":
      return await import("./api-routes/transactions/route.ts");
    case "admin":
      return await import("./api-routes/admin/route.ts");
    case "auth":
      return await import("./api-routes/auth/route.ts");
    case "auth/password-reset":
      return await import("./api-routes/auth/password-reset/route.ts");
    case "auth/verify":
      return await import("./api-routes/auth/verify/route.ts");
    case "admin/fees":
      return await import("./api-routes/admin/fees/route.ts");
    case "fees":
      return await import("./api-routes/fees/route.ts");
    case "marketplace":
      return await import("./api-routes/marketplace/route.ts");
    case "reviews":
      return await import("./api-routes/reviews/route.ts");
    case "profile":
      return await import("./api-routes/profile/route.ts");
    case "support":
      return await import("./api-routes/support/route.ts");
    case "notifications":
      return await import("./api-routes/notifications/route.ts");
    case "platform-status":
      return await import("./api-routes/platform-status/route.ts");
    case "public-config":
      return await import("./api-routes/public-config/route.ts");
    case "shops":
      return await import("./api-routes/shops/route.ts");
    case "security":
      return await import("./api-routes/security/route.ts");
    case "help":
      return await import("./api-routes/help/route.ts");
    case "shop-catalog":
      return await import("./api-routes/shop-catalog/route.ts");
    case "geny":
      return await import("./api-routes/geny/route.ts");
    case "resellers":
      return await import("./api-routes/resellers/route.ts");
    case "ads":
      return await import("./api-routes/ads/route.ts");
    case "bank-accounts":
      return await import("./api-routes/bank-accounts/route.ts");
    case "webhooks/maplerad":
      return await import("./api-routes/webhooks/maplerad/route.ts");
    case "payments/soleaspay":
      return await import("./api-routes/payments/soleaspay/route.ts");
    case "webhooks/soleaspay":
      return await import("./api-routes/webhooks/soleaspay/route.ts");
    case "payments/bkpay":
      return await import("./api-routes/payments/bkpay/route.ts");
    case "webhooks/bkpay":
      return await import("./api-routes/webhooks/bkpay/route.ts");
    default:
      return null;
  }
}

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = decodeURIComponent(urlObj.pathname);
  applySecurityHeaders(res);

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
    // Confiné strictement au dossier ./app : empêche /app/../server.js ou
    // /app/..%2f..%2f.env.* de remonter hors de l'arborescence des sources UI.
    const candidatePath = safeResolve(path.join(__dirname, "app"), pathname.slice("/app".length));
    if (!candidatePath) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("403 Forbidden");
      return;
    }
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
  // Verrou aussi sur les "pages" statiques (index.html, *.html, charges RSC *.txt)
  // des routes protégées, pour qu'elles ne contournent pas la redirection de connexion.
  const payloadRoute = pagePayloadRoute(pathname);
  if (payloadRoute && !isPublicPagePath(payloadRoute)) {
    const user = await getUserFromRequest(req, urlObj);
    if (!user) {
      res.writeHead(302, {
        Location: `/login?redirect=${encodeURIComponent(payloadRoute)}`,
        "Cache-Control": "no-store",
      });
      res.end();
      return;
    }
  }

  let filePath = safeResolve(CLIENT_DIST, pathname);
  let fileFound = Boolean(filePath) && fs.existsSync(filePath) && fs.statSync(filePath).isFile();

  if (!fileFound) {
    filePath = safeResolve(PUBLIC_DIR, pathname);
    fileFound = Boolean(filePath) && fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  }

  // Next.js App Router static RSC segment payloads are REQUESTED with dotted
  // segment paths (e.g. /dashboard/__next.dashboard.__PAGE__.txt) but WRITTEN to
  // disk as nested directories (/dashboard/__next.dashboard/__PAGE__.txt). Without
  // this mapping those requests 404, breaking client-side navigation to parent
  // routes (e.g. "Tableau de bord") with "unknown error occurred when fetching the script".
  if (!fileFound) {
    const segBase = path.basename(pathname);
    const rscMatch = segBase.match(/^__next\.(.+)\.txt$/);
    if (rscMatch) {
      const inner = rscMatch[1].split(".");
      if (inner.length > 1) {
        const nested = `__next.${inner[0]}/${inner.slice(1).join("/")}.txt`;
        const candidate = safeResolve(CLIENT_DIST, path.join(path.dirname(pathname), nested));
        if (candidate && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          filePath = candidate;
          fileFound = true;
        }
      }
    }
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
    // VERROU D'ACCÈS : aucune page (hors liste publique) n'est servie sans une
    // session utilisateur valide. Non connecté -> redirection vers /login.
    if (!isPublicPagePath(pathname)) {
      const user = await getUserFromRequest(req, urlObj);
      if (!user) {
        const target = `${pathname}${urlObj.search || ""}`;
        res.writeHead(302, {
          Location: `/login?redirect=${encodeURIComponent(target)}`,
          "Cache-Control": "no-store",
        });
        res.end();
        return;
      }
    }

    // Si URL racine "/" -> Servir la LANDING PAGE OFFICIELLE !
    if (pathname === "/" || pathname === "" || pathname === "/landing") {
      // Une session utilisateur valide ne doit pas retomber sur la landing :
      // on l'envoie directement au tableau de bord (pas de "faux déconnexion"
      // quand on tape le nom de domaine). Non connecté -> landing publique.
      const sessionUser = await getUserFromRequest(req, urlObj);
      if (sessionUser) {
        res.writeHead(302, {
          Location: "/dashboard",
          "Cache-Control": "no-store",
        });
        res.end();
        return;
      }
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
