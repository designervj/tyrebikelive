
import createNextIntlPlugin from "next-intl/plugin";
import { withPlausibleProxy } from "next-plausible";

import redirects from "./redirects.js";

const NEXT_PUBLIC_SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.platform === "win32" ? undefined : "standalone",
  images: {
    remotePatterns: [
      ...[NEXT_PUBLIC_SERVER_URL /* 'https://example.com' */].map((item) => {
        const url = new URL(item);

        return {
          hostname: url.hostname,
          protocol: url.protocol.replace(":", ""),
        };
      }),
    ],
  },
  reactStrictMode: true,
  redirects,
  transpilePackages: ['date-fns'],
  experimental: {
    viewTransition: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default withNextIntl(nextConfig);
