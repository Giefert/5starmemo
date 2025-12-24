const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add parent directory to watchFolders so Metro can resolve shared types
config.watchFolders = [
  path.resolve(__dirname, '..'), // Parent directory (5starmemo root)
];

// Ensure Metro can resolve .ts files from shared folder
config.resolver = {
  ...config.resolver,
  nodeModulesPaths: [
    path.resolve(__dirname, 'node_modules'),
  ],
};

module.exports = config;
