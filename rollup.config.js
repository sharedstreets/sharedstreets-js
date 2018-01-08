import uglify from 'rollup-plugin-uglify'
import node from 'rollup-plugin-node-resolve'
import builtins from 'rollup-plugin-node-builtins'
import commonjs from 'rollup-plugin-commonjs'
import json from 'rollup-plugin-json'

const input = 'index.mjs'
const name = 'sharedstreets'
const sourcemap = true

export default [{
  input,
  output: {
    file: 'dist/sharedstreets.mjs',
    format: 'es',
    sourcemap
  },
  plugins: [commonjs(), json(), builtins({crypto: true}), node()]
}, {
  input,
  output: {
    file: 'dist/sharedstreets.js',
    format: 'umd',
    name,
    sourcemap
  },
  plugins: [commonjs(), json(), builtins({crypto: true}), node()]
},
{
  input,
  output: {
    file: 'dist/sharedstreets.min.js',
    format: 'umd',
    name,
    sourcemap
  },
  plugins: [commonjs(), json(), builtins({crypto: true}), node(), uglify()]
}]
