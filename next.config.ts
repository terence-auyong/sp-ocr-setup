import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
  outputFileTracingExcludes: {
    '*': [
      'node_modules/@swc/**',
      'node_modules/esbuild/**',
      'node_modules/webpack/**',
      'node_modules/sharp/**',
      'node_modules/exceljs/**',
      'node_modules/xlsx/**',
      'node_modules/@aws-sdk/**',
      'node_modules/mysql2/**',
    ]
  }
};

export default nextConfig;
