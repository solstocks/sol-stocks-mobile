const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env = {}, argv = {}) {
  const config = await createExpoWebpackConfigAsync(
    {
      mode: argv.mode || env.mode || 'production',
      ...env,
    },
    argv
  );

  // Customize the webpack config here if needed
  
  // Add polyfills for Node.js modules used by Solana packages
  config.resolve.fallback = {
    ...config.resolve.fallback,
    "crypto": require.resolve("crypto-browserify"),
    "stream": require.resolve("stream-browserify"),
    "buffer": require.resolve("buffer"),
    "process": require.resolve("process/browser"),
    "vm": require.resolve("vm-browserify"),
    "fs": false,
    "net": false,
    "tls": false,
  };

  // Add buffer and process plugins
  config.plugins.push(
    new (require('webpack')).ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser',
    })
  );

  return config;
};