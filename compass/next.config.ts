import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native/Node-only packages stay out of the bundle.
  serverExternalPackages: ["@libsql/client", "imapflow", "nodemailer", "mailparser"],
  poweredByHeader: false,
  experimental: {
    serverActions: { bodySizeLimit: "3mb" }, // CV PDFs are capped at 2 MB
  },
};

export default nextConfig;
