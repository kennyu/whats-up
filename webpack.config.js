const createExpoWebpackConfigAsync = require('@expo/webpack-config');

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

  return config;
};


