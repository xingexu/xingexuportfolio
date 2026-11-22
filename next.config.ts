import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: "/", destination: "/home", permanent: false }];
  },
};

export default nextConfig;
