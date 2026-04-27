/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    optimizePackageImports: ["date-fns"],
  },
  // Explicitly use App Router
  appDir: true,
  // Clean build to avoid Pages Router artifacts
  cleanDistDir: true,
}

export default nextConfig
