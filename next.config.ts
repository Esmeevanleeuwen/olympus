import type { NextConfig } from "next";
const isGitHubPages = process.env.GITHUB_PAGES === "true";
const config: NextConfig = {
  poweredByHeader: false,
  transpilePackages: ["@olympus/workspace-ui"],
  ...(isGitHubPages ? {
    output: "export",
    basePath: "/olympus",
    assetPrefix: "/olympus/",
    images: { unoptimized: true }
  } : {})
};
export default config;
