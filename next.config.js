/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack configuration for Node.js module fallbacks
  experimental: {
    turbo: {
      resolveAlias: {
        fs: false,
        net: false,
        tls: false,
        'perf_hooks': false,
        dns: false,
        'child_process': false,
        'worker_threads': false,
      },
    },
  },
};

module.exports = nextConfig;