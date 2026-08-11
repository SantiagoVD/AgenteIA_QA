/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [{
      source: "/api/chat",
      destination: `${process.env.BACKEND_URL || "http://localhost:3001"}/api/chat`,
    }];
  },
};

export default nextConfig;
