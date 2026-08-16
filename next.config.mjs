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
  typescript: {
    // Exclude test files from Next.js build type checking
    // (They use dev-only dependencies like @playwright/test, jest, etc.)
    tsconfigPath: './tsconfig.json',
    ignoreBuildErrors: false,
  },
  eslint: {
    // Exclude test files from ESLint during build
    dirs: ['src', 'pages', 'utils', 'lib', 'components', 'app'],
  },
};

export default nextConfig;
