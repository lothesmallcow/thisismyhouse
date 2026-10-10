// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { siteUrl } from "./src/lib/util.ts";

const NOINDEX = [/\/grazie\/?$/, /\/anteprime\//, /\/lavori\/[^/]+\/demo\/?$/, /\/styleguide\/?$/, /\/404\/?$/];

export default defineConfig({
  site: siteUrl(),
  output: "static",
  trailingSlash: "ignore",
  build: { format: "directory", inlineStylesheets: "auto" },
  integrations: [
    sitemap({
      filter: (page) => !NOINDEX.some((re) => re.test(new URL(page).pathname)),
    }),
  ],
  image: { responsiveStyles: false },
  devToolbar: { enabled: false },
  vite: {
    plugins: [tailwindcss()],
  },
});
