// next.config.ts
import type { NextConfig } from 'next';

const phpApiUrl = process.env.PHP_API_URL || process.env.NEXT_PUBLIC_PHP_API_URL;
const resourcesUrl = process.env.NEXT_PUBLIC_RESOURCES_URL;

let apiHostname = '';
let resourcesHostname = '';

if (phpApiUrl) {
  try {
    apiHostname = new URL(phpApiUrl).hostname;
  } catch (error) {
    console.error('Invalid PHP API URL in env:', phpApiUrl);
  }
}

if (resourcesUrl) {
  try {
    resourcesHostname = new URL(resourcesUrl).hostname;
  } catch (error) {
    console.error('Invalid RESOURCES URL in env:', resourcesUrl);
  }
}

const imageRemoteHostnames = [...new Set([apiHostname, resourcesHostname].filter(Boolean))];

const legacyCourseRedirects = [
  'asvab',
  'oar',
  'afoqt',
  'sift',
  'astb',
  'hesi-a2',
  'ati-teas',
  'cna',
  'shsat',
  'state-math-test-prep',
] as const;

const CANONICAL_HOST = 'www.asvab-tutoring.com';
const NAKED_HOST = 'asvab-tutoring.com';

/** Naked domain → www (production uses x-forwarded-host from index.php proxy). */
const nakedToWwwRedirects = [
  {
    source: '/:path*',
    has: [{ type: 'header' as const, key: 'x-forwarded-host', value: NAKED_HOST }],
    destination: `https://${CANONICAL_HOST}/:path*`,
    permanent: true,
  },
  {
    source: '/:path*',
    has: [{ type: 'header' as const, key: 'host', value: NAKED_HOST }],
    destination: `https://${CANONICAL_HOST}/:path*`,
    permanent: true,
  },
];

const nextConfig: NextConfig = {
  output: 'standalone',
  async redirects() {
    return [
      ...nakedToWwwRedirects,
      {
        source: '/course/:code',
        destination: '/courses/:code',
        permanent: true,
      },
      ...legacyCourseRedirects.flatMap((course) => [
        {
          source: `/${course}`,
          destination: `/courses/${course}`,
          permanent: true,
        },
        {
          source: `/${course}/`,
          destination: `/courses/${course}`,
          permanent: true,
        },
        {
          source: `/${course}-practice-test`,
          destination: `/courses/${course}/free-practice-test`,
          permanent: true,
        },
        {
          source: `/${course}-prediction-test`,
          destination: `/courses/${course}/free-prediction-test`,
          permanent: true,
        },
        {
          source: `/courses/${course}/free-test`,
          destination: `/courses/${course}/free-practice-test`,
          permanent: true,
        },
      ]),
      {
        source: '/courses/:code/free-test',
        destination: '/courses/:code/free-practice-test',
        permanent: true,
      },
      // Retired city landing pages → canonical course pages
      {
        source: '/online-courses/:city/:courseCode',
        destination: '/courses/:courseCode',
        permanent: true,
      },
    ];
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: imageRemoteHostnames.map((hostname) => ({
      protocol: 'https' as const,
      hostname,
      port: '',
      pathname: '/**',
    })),
  },
};

export default nextConfig;
