const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Enable loading WebAssembly for expo-sqlite's wa-sqlite backend on Web
  config.experiments = {
    ...(config.experiments || {}),
    asyncWebAssembly: true,
  };

  // Ensure .wasm files are emitted correctly
  config.module.rules.push({
    test: /\.wasm$/,
    type: 'asset/resource',
  });

  return config;
};


