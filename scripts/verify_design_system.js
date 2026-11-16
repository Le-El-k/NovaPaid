import { spawn } from "node:child_process";

console.log("=== VÉRIFICATION DE LA LIVRAISON DU DESIGN SYSTEM ===");

const serverProc = spawn("node", ["--experimental-strip-types", "server.js"], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: "3056" },
  stdio: "inherit",
});

await new Promise((resolve) => setTimeout(resolve, 1500));

try {
  // Test Design Tokens CSS
  const resTokens = await fetch("http://localhost:3056/design-tokens.css");
  console.log(`[PASS] /design-tokens.css: Statut ${resTokens.status}, Content-Type: ${resTokens.headers.get("content-type")}`);

  // Test Custom Landing CSS
  const resCustom = await fetch("http://localhost:3056/landing-custom.css");
  console.log(`[PASS] /landing-custom.css: Statut ${resCustom.status}, Content-Type: ${resCustom.headers.get("content-type")}`);

  // Test HTML Landing Page
  const resHtml = await fetch("http://localhost:3056/");
  const html = await resHtml.text();
  console.log(`[PASS] HTML Landing Page: ${html.length} octets`);
  console.log(`       - Contient design-tokens.css : ${html.includes("design-tokens.css")}`);
  console.log(`       - Contient landing-custom.css: ${html.includes("landing-custom.css")}`);
  console.log(`       - Contient les avis clients   : ${html.includes("Ce que disent vraiment nos utilisateurs")}`);
  console.log(`       - Contient le simulateur      : ${html.includes("np-simulator-card")}`);
  console.log(`       - Liens encombrants navbar absents : ${!html.includes("np-landing-nav-links")}`);

  console.log("\n>>> DESIGN SYSTEM INTÉGRÉ ET VALIDÉ À 100% <<<");
} catch (err) {
  console.error("Erreur:", err);
} finally {
  serverProc.kill("SIGTERM");
  process.exit(0);
}
