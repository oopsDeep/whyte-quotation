import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma 7 with @prisma/adapter-pg needs these packages treated as server-side
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;
