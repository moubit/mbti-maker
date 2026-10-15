import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    {
      name: "local-export-runtime",
      configureServer(server) {
        server.middlewares.use("/__export_runtime", (_request, response) => {
          const path = new URL("./dist/index.html", import.meta.url);
          if (!fs.existsSync(path)) {
            response.statusCode = 503;
            response.end(
              "Run npm run build before exporting from the development server.",
            );
            return;
          }
          response.setHeader("Content-Type", "text/html; charset=utf-8");
          response.end(fs.readFileSync(path));
        });
      },
    },
  ],
});
