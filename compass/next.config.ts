import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native/Node-only packages stay out of the bundle.
  serverExternalPackages: ["@libsql/client", "imapflow", "nodemailer", "mailparser"],
  poweredByHeader: false,
  // compass/ lives inside another repo for now: pin the project root.
  outputFileTracingRoot: import.meta.dirname,
  turbopack: { root: import.meta.dirname },
  // GitHub Codespaces (demo trial, .devcontainer/): pages come through *.app.github.dev.
  ...(process.env.CODESPACES ? { allowedDevOrigins: ["*.app.github.dev"] } : {}),
  experimental: {
    serverActions: { bodySizeLimit: "3mb", ...(process.env.CODESPACES ? { allowedOrigins: ["*.app.github.dev", "localhost:3000"] } : {}) }, // CV PDFs are capped at 2 MB
  },
};

export default nextConfig;
