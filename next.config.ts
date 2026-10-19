import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // README screenshots and avatars come from many hosts; keep <img> unoptimized on Workers.
    unoptimized: true,
  },
};

export default nextConfig;

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
