module.exports = {
  preset: '@react-native/jest-preset',
  setupFilesAfterEnv: ['./jest-setup.js'],
  // The native folders carry vendored dependencies with suites of their own,
  // written against toolchains this project does not configure.
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/android/',
    '<rootDir>/ios/',
  ],
};
