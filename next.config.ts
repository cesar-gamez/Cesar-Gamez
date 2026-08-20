import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*.heic",
        headers: [{ key: "Content-Type", value: "image/heic" }],
      },
      {
        source: "/:path*.HEIC",
        headers: [{ key: "Content-Type", value: "image/heic" }],
      },
      {
        source: "/:path*.heif",
        headers: [{ key: "Content-Type", value: "image/heif" }],
      },
      {
        source: "/:path*.HEIF",
        headers: [{ key: "Content-Type", value: "image/heif" }],
      },
      {
        source: "/:path*.mov",
        headers: [{ key: "Content-Type", value: "video/quicktime" }],
      },
      {
        source: "/:path*.MOV",
        headers: [{ key: "Content-Type", value: "video/quicktime" }],
      },
    ];
  },
};

export default nextConfig;
