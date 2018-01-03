import uglify from 'rollup-plugin-uglify'
import typescript from 'rollup-plugin-typescript2'
import node from 'rollup-plugin-node-resolve'

const input = 'index.ts'
const name = 'sharedstreets'
const sourcemap = true
const tsconfigOverride = { compilerOptions: { target: 'es5' } }

export default [{
  input,
  output: {
    file: 'dist/sharedstreets.mjs',
    format: 'es',
    sourcemap
  },
  plugins: [typescript(), node()]
}, {
  input,
  output: {
    file: 'dist/sharedstreets.js',
    format: 'umd',
    name,
    sourcemap
  },
  plugins: [typescript({tsconfigOverride}), node()]
},
{
  input,
  output: {
    file: 'dist/sharedstreets.min.js',
    format: 'umd',
    name,
    sourcemap
  },
  plugins: [typescript({tsconfigOverride}), node(), uglify()]
}]
