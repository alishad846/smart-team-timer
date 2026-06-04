/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  allowedDevOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.56.1:3000"
  ]
};

export default nextConfig;
