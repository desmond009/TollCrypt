const webpack = require('webpack');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Add fallbacks for Node.js modules
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        "crypto": require.resolve("crypto-browserify"),
        "stream": require.resolve("stream-browserify"),
        "util": require.resolve("util"),
        "buffer": require.resolve("buffer"),
        "process": require.resolve("process"),
        "fs": false,
        "net": false,
        "tls": false,
        "path": false,
        "os": false,
        "child_process": false,
      };

      // Add plugins for global variables
      webpackConfig.plugins = [
        ...webpackConfig.plugins,
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process',
        }),
      ];

      return webpackConfig;
    },
  },
};
