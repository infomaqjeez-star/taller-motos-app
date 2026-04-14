/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  serverRuntimeConfig: {
    port: process.env.PORT || 3000,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "http2.mlstatic.com" },
      { protocol: "https", hostname: "**.mlstatic.com" },
      { protocol: "https", hostname: "**.mercadolibre.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; img-src 'self' https: data:; connect-src 'self' https://ajhmajaclimccrkehsyy.supabase.co wss://ajhmajaclimccrkehsyy.supabase.co https://api.mercadolibre.com https://auth.mercadolibre.com.ar; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; worker-src 'self' blob:; media-src 'self'; frame-src 'none';",
          },
        ],
      },
    ];
  },
};
module.exports = nextConfig;
