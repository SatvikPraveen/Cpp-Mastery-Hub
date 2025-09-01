// File: frontend/next.config.js
// Extension: .js

/** @type {import('next').NextConfig} */

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  // Basic configuration
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    // Enable App Router (Next.js 13+)
    appDir: false, // Set to true when migrating to app directory
    // Server Components
    serverComponentsExternalPackages: [],
    // Enable Turbopack for development (faster builds)
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },

  // TypeScript configuration
  typescript: {
    // Dangerously allow production builds to successfully complete even if type errors
    ignoreBuildErrors: false,
  },

  // ESLint configuration
  eslint: {
    // Only run ESLint on specific directories during production builds
    dirs: ['src', 'pages', 'components', 'lib', 'utils'],
    // Dangerously allow production builds to successfully complete even if ESLint errors
    ignoreDuringBuilds: false,
  },

  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  },

  // Public runtime configuration
  publicRuntimeConfig: {
    // Will be available on both server and client
    staticFolder: '/static',
  },

  // Server runtime configuration
  serverRuntimeConfig: {
    // Will only be available on the server side
    mySecret: 'secret',
  },

  // Asset optimization
  images: {
    // Configure image optimization
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
        port: '',
        pathname: '/api/**',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
    // Image formats
    formats: ['image/webp', 'image/avif'],
    // Image sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Enable dangerous use of SVG images
    dangerouslyAllowSVG: true,
    // Content security policy for SVG images
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Webpack configuration
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Monaco Editor configuration
    config.module.rules.push({
      test: /\.monaco\.worker\.(js|ts)$/,
      use: {
        loader: 'worker-loader',
        options: {
          name: 'static/[hash].worker.js',
          publicPath: '/_next/',
        },
      },
    });

    // Handle Monaco Editor
    config.module.rules.push({
      test: /monaco-editor\/.*\.css$/,
      use: ['style-loader', 'css-loader'],
    });

    // SVG handling
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: ['@svgr/webpack'],
    });

    // Alias configuration for Monaco Editor
    config.resolve.alias = {
      ...config.resolve.alias,
      'monaco-editor': 'monaco-editor/esm/vs/editor/editor.api.js',
    };

    // Ignore certain modules during build
    if (isServer) {
      config.externals.push({
        'monaco-editor': 'monaco-editor',
      });
    }

    // Bundle analyzer
    if (process.env.ANALYZE === 'true') {
      config.plugins.push(
        new (require('webpack-bundle-analyzer')).BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: isServer ? '../analyze/server.html' : './analyze/client.html',
          openAnalyzer: false,
        })
      );
    }

    return config;
  },

  // Headers configuration
  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        // API routes headers
        source: '/api/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'production' 
              ? 'https://cpp-mastery-hub.com' 
              : '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With',
          },
        ],
      },
    ];
  },

  // Redirects
  async redirects() {
    return [
      {
        source: '/docs',
        destination: '/learn',
        permanent: true,
      },
      {
        source: '/playground',
        destination: '/code',
        permanent: true,
      },
    ];
  },

  // Rewrites for API proxy
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/:path*`,
      },
    ];
  },

  // Compression
  compress: true,

  // Power by header
  poweredByHeader: false,

  // Trailing slash
  trailingSlash: false,

  // Build output
  output: 'standalone',

  // Development indicators
  devIndicators: {
    buildActivity: true,
    buildActivityPosition: 'bottom-right',
  },

  // Compiler options
  compiler: {
    // Remove console.* in production
    removeConsole: process.env.NODE_ENV === 'production' 
      ? { exclude: ['error'] } 
      : false,
    
    // React compiler optimizations
    reactRemoveProperties: process.env.NODE_ENV === 'production' 
      ? { properties: ['^data-test'] } 
      : false,
  },

  // Output file tracing
  outputFileTracing: true,

  // Generate build ID
  generateBuildId: async () => {
    // This could be the latest git commit hash
    return 'cpp-mastery-hub-build-' + Date.now();
  },

  // Custom page extensions
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],

  // Cross-origin isolation
  crossOrigin: 'anonymous',

  // Disable x-powered-by header
  xPoweredBy: false,
};

// Progressive Web App configuration
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: {
          maxEntries: 200,
        },
      },
    },
  ],
});

// Export configuration with plugins
module.exports = withBundleAnalyzer(withPWA(nextConfig));