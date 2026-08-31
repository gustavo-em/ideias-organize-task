module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // Reanimated 4 runs its animations through Worklets, and the plugin has to be
  // the last entry so it sees the final shape of every worklet function.
  plugins: ['react-native-worklets/plugin'],
};
