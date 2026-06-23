/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  allowedDevOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://172.27.64.1:3000",
    "http://192.168.56.1:3000",
    "http://localhost:3002",
    "http://127.0.0.1:3002",
    "http://172.27.64.1:3002",
    "http://192.168.56.1:3002",
  ],
};

export default nextConfig;
