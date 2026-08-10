/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Runs src/instrumentation.ts once at server startup (env validation + Sentry).
  experimental: {
    instrumentationHook: true,
  },
  images: {
    // Supabase Storage public bucket (avatars) — host filled in from env at deploy time.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;
