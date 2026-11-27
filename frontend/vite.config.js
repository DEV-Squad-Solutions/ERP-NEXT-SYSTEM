import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Split big libraries into their own files: they change rarely, so a
    // returning user keeps them cached when only the app code changes.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom)\//.test(id)) return "vendor-react";
          if (/node_modules\/(@reduxjs|redux|react-redux|reselect|immer)\//.test(id)) return "vendor-state";
          if (/node_modules\/(framer-motion|motion-dom|motion-utils)\//.test(id)) return "vendor-motion";
          if (/node_modules\/@microsoft\/signalr\//.test(id)) return "vendor-signalr";
          if (/node_modules\/(@tanstack|axios|zod|react-hook-form|@hookform)\//.test(id)) return "vendor-data";
          return undefined;
        },
      },
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "https://minierpapi.runasp.net",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
