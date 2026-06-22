/** @type {import('next').NextConfig} */
const nextConfig = {
  // Empty turbopack config to silence the warning
  turbopack: {},
 
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
        perf_hooks: false,
        'perf_hooks': false,
        dns: false,
        child_process: false,
        worker_threads: false,
        'worker_threads': false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
