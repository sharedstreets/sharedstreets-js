import uglify from 'rollup-plugin-uglify'
import typescript from 'rollup-plugin-typescript2'

const input = 'index.ts'
const name = 'sharedstreets'
const sourcemap = true

export default [{
  input,
  output: {
    file: 'dist/sharedstreets.mjs',
    format: 'es',
    sourcemap
  },
  plugins: [typescript()]
}, {
  input,
  output: {
    file: 'dist/sharedstreets.js',
    format: 'umd',
    name,
    sourcemap
  },
  plugins: [typescript()]
},
{
  input,
  output: {
    file: 'dist/sharedstreets.min.js',
    format: 'umd',
    name,
    sourcemap
  },
  plugins: [typescript(), uglify()]
}]
