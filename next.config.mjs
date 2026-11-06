/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep native PDF parsing dependencies out of the webpack bundle.
  // @napi-rs/canvas contains platform-specific .node binaries that must
  // be loaded by Node at runtime, not parsed by webpack during next build.
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas"],
  outputFileTracingIncludes: {
    "/api/jia/extension/download": ["./apps/jia-chrome-extension/**/*"],
  },
};

export default nextConfig;
