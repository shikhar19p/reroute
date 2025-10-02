const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Exclude the problematic GoogleSigninButton import
  if (moduleName === '../spec/SignInButtonNativeComponent') {
    return {
      type: 'empty',
    };
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
