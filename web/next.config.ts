import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Anchor to the repo so Next doesn't infer a wrong workspace root from
  // unrelated lockfiles higher up the tree.
  outputFileTracingRoot: path.join(__dirname, '../'),
};

export default nextConfig;
