/** @type {import('next').NextConfig} */
const isPages = process.env.GITHUB_PAGES === "true";
const repo = process.env.GITHUB_PAGES_BASE_PATH ?? "";

const nextConfig = {
  reactStrictMode: true,
  // Static export for GitHub Pages and CDN hosting.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: isPages && repo ? repo : undefined,
  assetPrefix: isPages && repo ? `${repo}/` : undefined,
};

export default nextConfig;
