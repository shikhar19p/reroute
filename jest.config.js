module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  // Exclude worktrees and node_modules from test discovery
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.claude/',
  ],
  // Override preset setupFiles — remove expo winter runtime (causes "outside scope" in node env)
  setupFiles: [],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|firebase)',
  ],
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  collectCoverageFrom: [
    'services/**/*.{ts,tsx}',
    'utils/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'screens/**/*.{ts,tsx}',
    'context/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  moduleNameMapper: {
    '^expo-constants$': '<rootDir>/__mocks__/expo-constants.js',
    '^.*/firebaseConfig$': '<rootDir>/__mocks__/firebaseConfig.js',
    // Mock expo winter runtime that breaks in node test environment
    // (setup.js does require('expo/src/winter') which installs __ExpoImportMetaRegistry)
    '^expo/src/winter$': '<rootDir>/__mocks__/expo-winter.js',
    '^expo/src/winter/(.*)$': '<rootDir>/__mocks__/expo-winter.js',
    '^expo/src/utils/getBundleUrl(.*)$': '<rootDir>/__mocks__/expo-winter.js',
  },
};
