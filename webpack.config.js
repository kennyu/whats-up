const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const webpack = require('webpack');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Enable loading WebAssembly for expo-sqlite's wa-sqlite backend on Web
  config.experiments = {
    ...(config.experiments || {}),
    asyncWebAssembly: true,
  };

  // Ensure .wasm resolves
  config.resolve = config.resolve || {};
  config.resolve.extensions = Array.from(new Set([...(config.resolve.extensions || []), '.wasm']));

  // Ensure .wasm files are emitted correctly
  config.module.rules.push(
    {
      test: /wa-sqlite\.wasm$/,
      type: 'asset/resource',
      generator: { filename: 'static/wasm/[name][ext]' },
    },
    {
      test: /\.wasm$/,
      type: 'asset/resource',
    }
  );

  // Work around relative wasm import path resolution in expo-sqlite's web worker
  config.plugins = config.plugins || [];
  config.plugins.push(
    new webpack.NormalModuleReplacementPlugin(
      /\.\/wa-sqlite\/wa-sqlite\.wasm$/,
      (resource) => {
        try {
          // Resolve to absolute path so webpack can find it reliably
          // eslint-disable-next-line global-require
          resource.request = require.resolve('expo-sqlite/web/wa-sqlite/wa-sqlite.wasm');
        } catch {}
      }
    )
  );

  return config;
};


