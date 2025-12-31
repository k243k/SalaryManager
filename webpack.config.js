/**
 * 時給計算アプリ - Webpack設定
 * Main/Renderer/Preloadプロセスのビルド設定
 */

const path = require('path');

const commonConfig = {
  mode: process.env.NODE_ENV || 'development',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
  },
  devtool: 'source-map',
};

const mainConfig = {
  ...commonConfig,
  target: 'electron-main',
  entry: './src/main/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist/main'),
    filename: 'index.js',
  },
  node: {
    __dirname: false,
    __filename: false,
  },
};

const preloadConfig = {
  ...commonConfig,
  target: 'electron-preload',
  entry: './src/preload/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist/preload'),
    filename: 'index.js',
  },
  node: {
    __dirname: false,
    __filename: false,
  },
};

const rendererConfig = {
  ...commonConfig,
  target: 'electron-renderer',
  entry: './src/renderer/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist/renderer'),
    filename: 'index.js',
  },
};

module.exports = [mainConfig, preloadConfig, rendererConfig];
