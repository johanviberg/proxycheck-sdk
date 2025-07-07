import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import dts from 'rollup-plugin-dts';

import { readFileSync } from 'node:fs';
const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));

const external = [
  ...Object.keys(packageJson.dependencies || {}),
  ...Object.keys(packageJson.peerDependencies || {}),
  'node:http',
  'node:https',
  'node:url',
  'node:util',
  'node:stream',
  'node:buffer',
  'node:crypto',
  'node:zlib'
];

const plugins = [
  resolve({
    preferBuiltins: true,
    browser: false
  }),
  commonjs(),
  typescript({
    tsconfig: './tsconfig.build.json',
    declaration: false
  })
];

export default [
  // CommonJS build
  {
    input: 'src/index.ts',
    output: {
      file: packageJson.main,
      format: 'cjs',
      sourcemap: true,
      exports: 'named'
    },
    external,
    plugins
  },
  // ESM build
  {
    input: 'src/index.ts',
    output: {
      file: packageJson.module,
      format: 'es',
      sourcemap: true
    },
    external,
    plugins
  },
  // Type definitions
  {
    input: 'src/index.ts',
    output: {
      file: packageJson.types,
      format: 'es'
    },
    external,
    plugins: [
      dts({
        respectExternal: true
      })
    ]
  }
];