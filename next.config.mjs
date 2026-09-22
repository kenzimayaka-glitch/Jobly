/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [{ source: "/cv", destination: "/talent/cvs", permanent: false }];
  },
};

export default nextConfig;
