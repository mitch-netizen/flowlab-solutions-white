/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@flowlab/auth", "@flowlab/branding", "@flowlab/contracts", "@flowlab/db", "@flowlab/events", "@flowlab/integrations"]
};

export default nextConfig;
