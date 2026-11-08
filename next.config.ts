import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Showcase prototype: all data is client-side (localStorage), so Cache Components /
  // partial prefetching (enabled by the scaffold) add friction without benefit.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
