import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Permissions-Policy',
            value: [
              'geolocation=()',
              'camera=()',
              // allow mic on our origin (disables in iframes/other origins)
              'microphone=(self)',
              'bluetooth=()',
              'usb=()',
              'hid=()',
              'serial=()',
              'midi=()',
              'xr-spatial-tracking=()',
              'screen-wake-lock=()',
              'local-network=()',
              'publickey-credentials-get=()',
              'payment=()',
              'browsing-topics=()',
              'interest-cohort=()',
            ].join(', '),
          },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
  images: {
    // Use custom Cloudinary loader to avoid /_next/image proxy and still keep responsive srcset.
    loader: 'custom',
    loaderFile: './src/lib/cloudinaryLoader.ts',
    // Next can still generate srcset breakpoints; Cloudinary serves optimized formats.
    // Use Next.js image optimizer (we've installed required native deps in Dockerfile).
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [320, 420, 640, 768, 1024, 1280, 1536],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
