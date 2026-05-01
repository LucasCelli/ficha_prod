const nextConfig = {
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
