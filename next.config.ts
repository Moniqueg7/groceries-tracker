import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  serverExternalPackages: ["tesseract.js", "@prisma/client", "prisma"],
  outputFileTracingIncludes: {
    "/*": ["./src/generated/prisma-household/**/*"],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
