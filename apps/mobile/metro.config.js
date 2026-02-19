const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname)

// Used to resolve Better Auth exports
// https://www.better-auth.com/docs/integrations/expo#configure-metro-bundler
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
