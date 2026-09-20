import type { NextConfig } from "next";
import fs from "node:fs";

const hasCustomDomain = fs.existsSync("./public/CNAME");
const basePath = hasCustomDomain ? "" : (process.env.BASE_PATH || process.env.NEXT_PUBLIC_BASE_PATH || "");

const nextConfig: NextConfig = {
  output: "export",
  basePath: basePath || undefined,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
