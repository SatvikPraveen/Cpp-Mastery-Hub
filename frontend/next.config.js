/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
  compress: true,
  trailingSlash: false,
  output: 'standalone',

  typescript: {
    ignoreBuildErrors: false,
  },

  eslint: {
    dirs: ['src'],
    ignoreDuringBuilds: false,
  },

  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'ui-avatars.com', pathname: '/api/**' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
    ],
    formats: ['image/webp', 'image/avif'],
  },

  webpack: (config, { isServer }) => {
    // monaco-editor is browser-only; never bundle it into the server build.
    if (isServer) {
      config.externals = [...(config.externals || []), 'monaco-editor'];
    }
    return config;
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },

  async redirects() {
    return [
      { source: '/docs', destination: '/learn', permanent: true },
      { source: '/playground', destination: '/code', permanent: true },
    ];
  },

  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/:path*`,
      },
    ];
  },

  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
};

module.exports = nextConfig;
