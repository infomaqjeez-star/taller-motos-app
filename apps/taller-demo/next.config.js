/** @type {import('next').NextConfig} */

const securityHeaders = [
  // HSTS: 6 meses, incluir subdominios. preload puede agregarse cuando se registre en hstspreload.org.
  { key: "Strict-Transport-Security", value: "max-age=15552000; includeSubDomains" },
  // Prevenir clickjacking
  { key: "X-Frame-Options", value: "DENY" },
  // Bloquear MIME sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Referrer minimo a cross-origin
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Limitar features browser
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  // XSS legacy (modernos browsers usan CSP, pero no molesta)
  { key: "X-XSS-Protection", value: "0" },
];

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  poweredByHeader: false,
  serverRuntimeConfig: { port: process.env.PORT || 3001 },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  experimental: {
    serverActions: {
      // Permitir Server Actions desde dominios productivos y desarrollo
      allowedOrigins: [
        'localhost:3001',
        'localhost:3000',
        'appjeezpro.store',
        'www.appjeezpro.store',
        'taller-motos-app-production.up.railway.app',
      ],
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
