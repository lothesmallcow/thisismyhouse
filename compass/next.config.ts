import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native/Node-only packages stay out of the bundle.
  serverExternalPackages: ["@libsql/client", "imapflow", "nodemailer", "mailparser"],
  poweredByHeader: false,
  // compass/ lives inside another repo for now: pin the project root.
  outputFileTracingRoot: import.meta.dirname,
  turbopack: { root: import.meta.dirname },
  experimental: {
    serverActions: { bodySizeLimit: "3mb" }, // CV PDFs are capped at 2 MB
  },
};

export default nextConfig;
