import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api/proxy": {
        target: "https://api.hubapi.com",
        changeOrigin: true,
        secure: true,
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq, req) => {
            const hsPath = req.headers["x-hs-path"];
            if (typeof hsPath === "string") {
              proxyReq.path = hsPath;
            }
          });
        },
      },
    },
  },
});
