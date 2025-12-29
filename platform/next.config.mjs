/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/engine/scan",
        destination: "http://localhost:8000/scan",
      },
    ];
  },
};

export default nextConfig;
