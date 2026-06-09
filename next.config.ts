import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Book covers are served straight from Open Library's cover CDN.
    remotePatterns: [
      { protocol: "https", hostname: "covers.openlibrary.org" },
    ],
  },
};

export default nextConfig;
