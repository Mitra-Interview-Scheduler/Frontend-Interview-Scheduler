import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const apiOrigin = (process.env.VITE_API_BASE_URL || "http://localhost:8080/api")
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");

const cspDirectives = (scriptSrc: string) =>
  [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https: blob:",
    `connect-src 'self' ${apiOrigin} ws: wss: https://accounts.google.com`,
    "frame-src https://accounts.google.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

const commonSecurityHeaders = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};

const prodScriptSrc = "'self' https://accounts.google.com";
const prodCsp = cspDirectives(prodScriptSrc);
const prodCspMeta = prodCsp.replace("frame-ancestors 'none'; ", "");

const prodSecurityHeaders = {
  ...commonSecurityHeaders,
  "Content-Security-Policy": prodCsp,
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 5173,
    // No CSP in dev: Vite injects an inline React Refresh preamble that a
    // strict script-src would block, which crashes the app (toast.jsx / SWC).
    headers: commonSecurityHeaders,
  },
  preview: {
    headers: prodSecurityHeaders,
  },
  define: {
    global: "globalThis",
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    mode !== "development" && {
      name: "html-csp",
      transformIndexHtml(html: string) {
        return html.replace(
          "</head>",
          `    <meta http-equiv="Content-Security-Policy" content="${prodCspMeta}" />\n  </head>`
        );
      },
    },
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
