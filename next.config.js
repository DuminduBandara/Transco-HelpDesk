/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: ["nodemailer", "mysql2", "bcryptjs"],
  },
};

module.exports = nextConfig;
