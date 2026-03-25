/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@supabase/supabase-js"],
  experimental: {
    serverComponentsExternalPackages: ["@supabase/supabase-js"],
  },
};
module.exports = nextConfig;
