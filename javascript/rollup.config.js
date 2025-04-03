import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
// Option 1: Use require for package.json
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pkg = require('./package.json');

// List external dependencies to exclude from bundle
const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {})
];

// Shared config options
const commonPlugins = [
  resolve(),
  babel({ 
    babelHelpers: 'bundled',
    presets: [['@babel/preset-env', { targets: { node: '14' } }]]
  })
];

export default [
  // ESM build
  {
    input: 'src/index.js',
    output: {
      file: 'dist/index.mjs',
      format: 'esm'
    },
    external,
    plugins: commonPlugins
  },
  
  // CommonJS build
  {
    input: 'src/index.js',
    output: {
      file: 'dist/index.cjs',
      format: 'cjs',
      exports: 'named'
    },
    external,
    plugins: [
      ...commonPlugins,
      commonjs()
    ]
  },
  // Browser build
  {
    input: 'src/browser.js',
    output: {
      file: 'dist/browser.mjs',
      format: 'esm'
    },
    external,
    plugins: commonPlugins
  },
];