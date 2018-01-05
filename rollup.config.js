import uglify from 'rollup-plugin-uglify'
import node from 'rollup-plugin-node-resolve'

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
  plugins: [node()]
}, {
  input,
  output: {
    file: 'dist/sharedstreets.js',
    format: 'umd',
    name,
    sourcemap
  },
  plugins: [node()]
},
{
  input,
  output: {
    file: 'dist/sharedstreets.min.js',
    format: 'umd',
    name,
    sourcemap
  },
  plugins: [node(), uglify()]
}]
