import { createFileRoute } from "@tanstack/react-router";

// TODO: substitua pelo URL definitivo do projeto quando publicar.
const BASE_URL = "";

const ROUTES = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/participar", changefreq: "monthly", priority: "0.8" },
  { path: "/palpites", changefreq: "daily", priority: "0.7" },
  { path: "/ranking", changefreq: "hourly", priority: "0.9" },
  { path: "/jogos", changefreq: "hourly", priority: "0.8" },
  { path: "/regras", changefreq: "monthly", priority: "0.5" },
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const urls = ROUTES.map(
          (e) =>
            `  <url>\n    <loc>${BASE_URL}${e.path}</loc>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`,
        );
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
