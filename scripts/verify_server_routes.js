import { spawn } from "node:child_process";

const port = "3055";
const serverProc = spawn("node", ["--experimental-strip-types", "server.js"], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: port },
  stdio: "ignore",
});
const base = "http://localhost:" + port;
const checks = [];

function check(label, ok, detail) {
  checks.push(Boolean(ok));
  console.log((ok ? "[PASS] " : "[FAIL] ") + label + (detail ? " — " + detail : ""));
}

function sessionCookie(response, cookieName) {
  const setCookies = response.headers.getSetCookie?.() || [response.headers.get("set-cookie") || ""];
  const match = setCookies.find((cookie) => cookie.startsWith(cookieName + "="));
  return match ? match.split(";")[0] : "";
}

try {
  let ready = false;
  for (let attempt = 0; attempt < 30 && !ready; attempt += 1) {
    try {
      const response = await fetch(base + "/");
      ready = response.status === 200;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  if (!ready) throw new Error("Le serveur de vérification ne démarre pas.");

  const home = await fetch(base + "/");
  const homeHtml = await home.text();
  check("Page d’accueil", home.status === 200);
  check("Aucun accès admin public dans la navigation", !homeHtml.includes('href="/admin"'));
  check("Page avis présente", homeHtml.includes("Avis Clients") || homeHtml.includes('id="reviews"'));

  const registerPage = await fetch(base + "/register");
  const registerHtml = await registerPage.text();
  check("Route inscription dédiée", registerPage.status === 200 && registerHtml.includes("Inscription NovaPaid"));

  const dashboardPage = await fetch(base + "/dashboard");
  const dashboardHtml = await dashboardPage.text();
  check(
    "Route tableau de bord dédiée",
    dashboardPage.status === 200 && dashboardHtml.includes("np-app") && dashboardHtml.includes("ESPACE PERSONNEL")
  );

  const reviews = await fetch(base + "/api/reviews");
  const reviewData = await reviews.json();
  check("API avis", reviews.status === 200 && Array.isArray(reviewData.reviews));

  const admin = await fetch(base + "/admin");
  const adminHtml = await admin.text();
  check(
    "Console admin par e-mail et mot de passe",
    admin.status === 200 && /type="email"/i.test(adminHtml) && /type="password"/i.test(adminHtml)
  );

  const oldAdminPath = await fetch(base + "/portal-prive-gestion", { redirect: "manual" });
  check(
    "Ancienne adresse redirigée vers /admin",
    oldAdminPath.status === 308 && oldAdminPath.headers.get("location") === "/admin"
  );

  const session = await fetch(base + "/api/admin?section=session");
  const sessionData = await session.json();
  check(
    "API refuse une session admin absente",
    session.status === 200 && sessionData.authenticated === false
  );

  const protectedSection = await fetch(base + "/api/admin?section=users");
  check("Sections admin protégées par session", protectedSection.status === 401);

  const adminEmail = process.env.NOVAPAID_BOOTSTRAP_ADMIN_EMAIL;
  const adminPassword = process.env.NOVAPAID_BOOTSTRAP_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) throw new Error("Identifiants QA administrateur absents.");
  const adminLogin = await fetch(base + "/api/admin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: base,
    },
    body: JSON.stringify({ action: "login", email: adminEmail, password: adminPassword }),
  });
  const adminCookie = sessionCookie(adminLogin, "np_admin_session");
  check("Connexion admin par e-mail et mot de passe", adminLogin.status === 200 && Boolean(adminCookie));

  const adminSession = await fetch(base + "/api/admin?section=session", {
    headers: { Cookie: adminCookie },
  });
  const adminSessionData = await adminSession.json();
  check("Session administrateur valide", adminSessionData.authenticated === true);

  const adminOverview = await fetch(base + "/api/admin?section=overview", {
    headers: { Cookie: adminCookie },
  });
  check("Tableau de bord administrateur", adminOverview.status === 200);

  const adminLogout = await fetch(base + "/api/admin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
      Origin: base,
    },
    body: JSON.stringify({ action: "logout" }),
  });
  check("Déconnexion administrateur", adminLogout.status === 200);

  const userEmail = "qa-" + Date.now() + "@example.invalid";
  const userPassword = "Qa-Platform-Test-2026!";
  const register = await fetch(base + "/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "register",
      name: "NovaPaid QA",
      email: userEmail,
      phone: "",
      password: userPassword,
    }),
  });
  const userCookie = sessionCookie(register, "np_user_session");
  check("Inscription client", register.status === 201 && Boolean(userCookie));

  const dashboardAfterRegistration = await fetch(base + "/dashboard", {
    headers: { Cookie: userCookie },
  });
  const dashboardAfterRegistrationHtml = await dashboardAfterRegistration.text();
  check(
    "Tableau de bord servi après inscription",
    dashboardAfterRegistration.status === 200 &&
      dashboardAfterRegistrationHtml.includes("ESPACE PERSONNEL") &&
      !dashboardAfterRegistrationHtml.includes('href="/register"')
  );

  const userSession = await fetch(base + "/api/auth", {
    headers: { Cookie: userCookie },
  });
  check("Session client créée", userSession.status === 200);

  const userLogout = await fetch(base + "/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: userCookie },
    body: JSON.stringify({ action: "logout" }),
  });
  check("Déconnexion client", userLogout.status === 200);

  const userLogin = await fetch(base + "/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", emailOrPhone: userEmail, password: userPassword }),
  });
  const loginCookie = sessionCookie(userLogin, "np_user_session");
  check("Connexion client après inscription", userLogin.status === 200 && Boolean(loginCookie));

  const userLogoutAfterLogin = await fetch(base + "/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: loginCookie },
    body: JSON.stringify({ action: "logout" }),
  });
  check("Déconnexion après connexion client", userLogoutAfterLogin.status === 200);
} catch (error) {
  console.error("[FAIL] Vérification du serveur:", error?.message || "erreur inattendue");
  checks.push(false);
} finally {
  serverProc.kill("SIGTERM");
}

if (checks.some((result) => !result)) process.exitCode = 1;
else console.log("Vérification des routes terminée.");
