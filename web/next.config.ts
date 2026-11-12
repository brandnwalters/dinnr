import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  async redirects() {
    // Keep old links and bookmarks working (Next passes the query, e.g. ?meal=&hall=, through):
    // Favorites moved to the Me tab, and Combos became Macros.
    return [
      { source: "/favorites", destination: "/me", permanent: true },
      { source: "/combos", destination: "/macros", permanent: true },
    ];
  },
};

export default nextConfig;
