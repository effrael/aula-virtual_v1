import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["172.20.10.4"],
  // El middleware de Supabase procesa todos los POST (server actions incluidos).
  // El límite por defecto es 10MB; archivos más grandes causan "Unexpected end of form".
  middlewareClientMaxBodySize: "2gb",
  experimental: {
    serverActions: {
      bodySizeLimit: "2gb",
    },
  },
};

export default nextConfig;
