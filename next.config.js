/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Keep the Postgres driver as a normal Node module on the server.
    serverComponentsExternalPackages: ["pg"],
  },
};
module.exports = nextConfig;
