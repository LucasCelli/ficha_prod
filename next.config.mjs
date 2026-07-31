const isProduction = process.env.NODE_ENV === "production";

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com",
  "font-src 'self' data:",
  "connect-src 'self' https://api.cloudinary.com https://res.cloudinary.com https://*.supabase.co wss://*.supabase.co",
  "worker-src 'self' blob:",
  "frame-src 'self' blob:",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(isProduction ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

const printRouteSecurityHeaders = securityHeaders.map((header) => {
  if (header.key === "Content-Security-Policy") {
    return { ...header, value: contentSecurityPolicy.replace("frame-ancestors 'none'", "frame-ancestors 'self'") };
  }

  if (header.key === "X-Frame-Options") {
    return { ...header, value: "SAMEORIGIN" };
  }

  return header;
});

const nextConfig = {
  serverExternalPackages: ["exceljs"],
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/fichas/:id/imprimir", headers: printRouteSecurityHeaders },
    ];
  },
  images: {
    remotePatterns: [
      {
        hostname: "res.cloudinary.com",
        protocol: "https",
      },
    ],
  },
  reactStrictMode: true,
};

export default nextConfig;
