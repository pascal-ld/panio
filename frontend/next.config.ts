import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  fallbacks: {
    document: "/offline",
  },
});

function backendImagePattern(): { protocol: "http" | "https"; hostname: string; pathname: string } {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://back.panio.local";

  try {
    const parsed = new URL(apiUrl);
    return {
      protocol: parsed.protocol === "https:" ? "https" : "http",
      hostname: parsed.hostname,
      pathname: "/uploads/**",
    };
  } catch {
    return { protocol: "http", hostname: "back.panio.local", pathname: "/uploads/**" };
  }
}

const backendPattern = backendImagePattern();
const frontendHost = process.env.FRONTEND_HOST ?? "panio.local";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [frontendHost, backendPattern.hostname],
  images: {
    remotePatterns: [
      backendPattern,
      { protocol: "http", hostname: "localhost", port: "8080", pathname: "/uploads/**" },
    ],
  },
};

export default withPWA(nextConfig);
