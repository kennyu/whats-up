const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Allow importing .sql files (optional for Drizzle migrations-in-bundle)
config.resolver.sourceExts.push('sql');

module.exports = config;


