const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Improve file watching stability
config.watchFolders = [__dirname];

// Ignore problematic directories that cause watch errors on Windows
config.resolver.blacklistRE = /node_modules\/\.expo-modules-core.*\.cxx|android\/\.cxx|ios\/build/;

config.watcher = {
  // Ignore build directories that cause issues with spaces in paths
  watchman: {
    ignore_dirs: [
      '.cxx',
      'build',
      'android/.cxx',
      'android/build',
      'ios/build',
    ],
  },
  // Increase timeout for slow file systems
  healthCheck: {
    enabled: true,
    interval: 30000,
    timeout: 10000,
  },
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Exclude the problematic GoogleSigninButton import
  if (moduleName === '../spec/SignInButtonNativeComponent') {
    return {
      type: 'empty',
    };
  }

  return context.resolveRequest(context, moduleName, platform);
};

// Add file extensions for better resolution
config.resolver.sourceExts = [...config.resolver.sourceExts, 'jsx', 'ts', 'tsx'];

module.exports = config;
