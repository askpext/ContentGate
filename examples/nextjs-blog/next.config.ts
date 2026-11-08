import type { NextConfig } from 'next';

const config: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: '/articles/:path*', headers: [
      { key: 'Cache-Control', value: 'private, no-store' },
      { key: 'CDN-Cache-Control', value: 'no-store' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
    ] }];
  },
};
export default config;
