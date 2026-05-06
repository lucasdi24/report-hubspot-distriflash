import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api/hs": {
        target: "https://api.hubapi.com",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/hs/, ""),
        secure: true,
      },
    },
  },
});
