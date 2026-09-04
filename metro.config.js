const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// This repo also contains the marketing/portal Next.js app under `web/` and a
// static site under `website/`. Metro must not scan their churning build outputs
// (.next, node_modules) or watch folders that Next rebuilds concurrently —
// doing so crashes the watcher with ENOENT. Keep Metro scoped to the Expo app.
config.resolver.blockList = [
  /\/web\/node_modules\/.*/,
  /\/website\/.*/,
  /\/web\/\.next\/.*/,
  /\/android\/build\/.*/,
  /\/dist\/.*/,
];

module.exports = config;
