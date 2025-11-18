/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    // Fix for use-sync-external-store CommonJS/ESM interop
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'use-sync-external-store/with-selector': require.resolve('use-sync-external-store/with-selector'),
      };
    }
    return config;
  },
  // PWA configuration
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
