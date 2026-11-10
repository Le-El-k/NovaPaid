import { cloudflare } from "@cloudflare/vite-plugin";
import vinext from "vinext";
import { defineConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
    extensions: [".mjs", ".js", ".mts", ".ts", ".jsx", ".tsx", ".json"],
  },
  // The embedded preview does not expose Vite's HMR WebSocket transport.
  // Keeping the dev overlay enabled there turns a recoverable client error
  // into an unhandled `send` rejection that covers the whole storefront.
  server: {
    // The hosted preview keeps a page alive after its WebSocket server is
    // restarted. Disable HMR completely there: otherwise Vite's stale client
    // can reject while trying to call `socket.send`, producing the overlay
    // shown to visitors instead of a recoverable console error.
    hmr: false,
    // Vite 8 otherwise installs a global unhandled-rejection forwarder. With
    // HMR disabled there is no WebSocket transport, so that forwarder would
    // call `send` on an undefined socket and mask the original page state.
    forwardConsole: false,
  },
  plugins: [
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
    vinext(),
  ],
});
