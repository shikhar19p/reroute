const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Improve file watching stability
config.watchFolders = [__dirname];

// Ignore problematic directories that cause watch errors on Windows
config.resolver.blacklistRE = /node_modules\/\.expo-modules-core.*\.cxx|android\/\.cxx|ios\/build/;

// Enable minification for web when EXPO_WEB_MINIFY=true
// Run: EXPO_WEB_MINIFY=true npx expo start --web
if (process.env.EXPO_WEB_MINIFY === 'true') {
  config.transformer = {
    ...config.transformer,
    minifierConfig: {
      compress: {
        drop_console: true,
        passes: 2,
      },
      mangle: true,
    },
  };
}

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Exclude the problematic GoogleSigninButton import
  if (moduleName === '../spec/SignInButtonNativeComponent') {
    return { type: 'empty' };
  }

  // react-native-webview is native-only; return empty module for web
  if (platform === 'web' && moduleName === 'react-native-webview') {
    return { type: 'empty' };
  }

  // react-native-calendars ships Profiler.js with raw JSX that Metro web can't bundle;
  // Profiler is never used at runtime so an empty module is safe
  if (platform === 'web' && moduleName.includes('react-native-calendars') && moduleName.includes('Profiler')) {
    return { type: 'empty' };
  }

  return context.resolveRequest(context, moduleName, platform);
};

// Add file extensions for better resolution
config.resolver.sourceExts = [...config.resolver.sourceExts, 'jsx', 'ts', 'tsx'];

module.exports = config;
