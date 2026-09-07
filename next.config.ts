import type { NextConfig } from "next";

const configuredApiProxyTarget = (
  process.env.API_PROXY_TARGET ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:4000"
).replace(/\/+$/, "");

const apiProxyTarget =
  process.env.NODE_ENV === "development" &&
  process.env.ALLOW_REMOTE_API_IN_DEV !== "true"
    ? "http://127.0.0.1:4000"
    : configuredApiProxyTarget;

if (!/^https?:\/\//.test(apiProxyTarget)) {
  throw new Error(
    "API_PROXY_TARGET must be an absolute backend URL such as https://api.example.com. It cannot be /api because that creates a rewrite loop.",
  );
}

const nextConfig: NextConfig = {
  // Keep browser API requests on the web origin so session cookies are first-party.
  env: {
    NEXT_PUBLIC_API_BASE_URL: "/api",
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiProxyTarget}/:path*`,
      },
    ];
  },
};

export default nextConfig;
