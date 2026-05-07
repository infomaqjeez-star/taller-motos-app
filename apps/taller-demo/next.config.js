/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  serverRuntimeConfig: { port: process.env.PORT || 3001 },
  images: {
    unoptimized: true
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3001']
    }
  }
};

// Configurar para no hacer static generation de rutas API
module.exports = nextConfig;
