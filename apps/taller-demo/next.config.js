/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  serverRuntimeConfig: { port: process.env.PORT || 3001 },
  images: {
    unoptimized: true
  }
};
module.exports = nextConfig;
