import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

function shopProxyPlugin(): Plugin {
  return {
    name: "shop-proxy",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const requestUrl = req.url ?? "";
        if (!requestUrl.startsWith("/__shop")) {
          next();
          return;
        }

        const target = new URL(requestUrl, "http://vite.local").searchParams.get("url");
        if (!target || !/^https?:\/\//i.test(target)) {
          res.statusCode = 400;
          res.end("Bad url");
          return;
        }

        let parsed: URL;
        try {
          parsed = new URL(target);
        } catch {
          res.statusCode = 400;
          res.end("Bad url");
          return;
        }

        const host = parsed.hostname.toLowerCase();
        if (
          host === "localhost" ||
          host.endsWith(".localhost") ||
          host === "127.0.0.1" ||
          host === "::1" ||
          host.endsWith(".internal")
        ) {
          res.statusCode = 403;
          res.end("Forbidden");
          return;
        }

        try {
          const proxied = await fetch(target, {
            headers: {
              Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
              "User-Agent": "sale-product-fetch",
            },
          });
          res.statusCode = proxied.status;
          res.setHeader(
            "Content-Type",
            proxied.headers.get("content-type") ?? "text/html; charset=utf-8",
          );
          res.end(new Uint8Array(await proxied.arrayBuffer()));
        } catch (error) {
          res.statusCode = 502;
          res.end(error instanceof Error ? error.message : "Proxy failed");
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), shopProxyPlugin()],
  server: {
    port: 5173,
  },
});
