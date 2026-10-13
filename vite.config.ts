import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  root: "frontend",
  publicDir: "../public",
  envDir: false,
  envPrefix: [],
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    fs: {
      strict: true,
      allow: [resolve("frontend"), resolve("public"), resolve("node_modules")],
      deny: [
        ".env",
        ".env.*",
        "**/*.{crt,pem,key}",
        "**/.git/**",
        "**/.local/**",
        "**/.netlify/**",
        "**/supabase/.temp/**",
        "**/private/**",
        "**/secrets/**",
      ],
    },
    proxy: {
      "/admin/api/": { target: "http://127.0.0.1:8788", changeOrigin: true },
      "/api/": { target: "http://127.0.0.1:8788", changeOrigin: true },
      "/asset-gateway/": {
        target: "http://127.0.0.1:8789",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/asset-gateway/, ""),
      },
    },
  },
  build: {
    outDir: "../build/web",
    emptyOutDir: true,
    rolldownOptions: {
      input: {
        web: resolve("frontend/index.html"),
        admin: resolve("frontend/admin/index.html"),
      },
    },
  },
});
