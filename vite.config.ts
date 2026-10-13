import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  root: "frontend",
  publicDir: "../public",
  envDir: false,
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: {
      "/admin/api/": { target: "http://127.0.0.1:8788", changeOrigin: true },
      "/local-files": { target: "http://127.0.0.1:8788", changeOrigin: true },
    },
  },
  build: {
    outDir: "../build/web",
    emptyOutDir: true,
    rolldownOptions: { input: resolve("frontend/admin/index.html") },
  },
});
