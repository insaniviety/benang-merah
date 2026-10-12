// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";
import type { Plugin } from "vite";

const pwaPlugins = VitePWA({
  strategies: "generateSW",
  filename: "sw.js",
  outDir: "dist/client",
  manifest: false, // The shared head links to public/manifest.json.
  injectRegister: null,
  registerType: "autoUpdate",
  devOptions: { enabled: false },
  workbox: {
    globPatterns: ["assets/**/*.{js,css,woff,woff2}", "icons/*.png", "favicon.ico", "manifest.json", "index.html"],
    maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
    cleanupOutdatedCaches: true,
    // Cache the root HTML under a non-route key, so Workbox's automatic
    // index.html aliases never intercept real navigations as cache-first.
    manifestTransforms: [async (entries) => ({
      manifest: entries.map((entry) => entry.url === "index.html"
        ? { ...entry, url: "offline-shell.html" } : entry),
      warnings: [],
    })],
    navigateFallback: undefined,
    runtimeCaching: [
      {
        urlPattern: ({ request, url }) => request.mode === "navigate"
          && url.origin === self.location.origin
          && !/^\/(?:~oauth|api)(?:\/|$)/.test(url.pathname),
        handler: "NetworkFirst",
        options: {
          cacheName: "bm-navigation-v1",
          networkTimeoutSeconds: 4,
          cacheableResponse: { statuses: [200] },
          expiration: { maxEntries: 20, maxAgeSeconds: 7 * 24 * 60 * 60 },
          precacheFallback: { fallbackURL: "/offline-shell.html" },
        },
      },
      {
        urlPattern: ({ url }) => url.origin === self.location.origin
          && /^\/assets\/.+-[\w-]{8,}\.(?:js|css|woff2?)$/.test(url.pathname),
        handler: "CacheFirst",
        options: {
          cacheName: "bm-assets-v1",
          cacheableResponse: { statuses: [200] },
          expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
    ],
  },
});

// Start prerenders after environment builds. Generate SW only after those HTML
// documents exist, rather than the PWA plugin's earlier client closeBundle.
for (const plugin of pwaPlugins) {
  plugin.applyToEnvironment = (environment) => environment.name === "client";
  if (plugin.name === "vite-plugin-pwa:build") delete plugin.closeBundle;
}
const finalizeOffline: Plugin = {
  name: "benang-merah:offline-after-prerender",
  apply: "build",
  enforce: "post",
  buildApp: {
    order: "post",
    async handler() {
      const { access, copyFile } = await import("node:fs/promises");
      await access("dist/client/index.html");
      await copyFile("dist/client/index.html", "dist/client/offline-shell.html");
      const pwa = pwaPlugins.find((plugin) => plugin.name === "vite-plugin-pwa");
      if (!pwa?.api) throw new Error("Offline app generator unavailable");
      await pwa.api.generateSW();
    },
  },
};

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    pages: [{ path: "/" }],
    prerender: { enabled: true, autoStaticPathsDiscovery: false },
  },
  vite: { plugins: [...pwaPlugins, finalizeOffline] },
});
