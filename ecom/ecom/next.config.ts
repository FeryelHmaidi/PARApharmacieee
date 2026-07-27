import type { NextConfig } from "next";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_HOST = (() => {
  if (!SUPABASE_URL) return undefined;
  try {
    return new URL(SUPABASE_URL).hostname;
  } catch {
    return undefined;
  }
})();

const imageDomains = ["images.example.com", "example.com"];
if (SUPABASE_HOST && !imageDomains.includes(SUPABASE_HOST)) {
  imageDomains.push(SUPABASE_HOST);
}

const nextConfig: NextConfig = {
  images: {
    domains: imageDomains,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;
