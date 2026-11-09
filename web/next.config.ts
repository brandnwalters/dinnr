import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  async redirects() {
    // Favorites moved to the Me tab: keep old links and bookmarks working.
    return [{ source: "/favorites", destination: "/me", permanent: true }];
  },
};

export default nextConfig;
