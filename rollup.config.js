import node from 'rollup-plugin-node-resolve'
import typescript from 'rollup-plugin-typescript2'

const input = 'index.ts'
const name = 'sharedstreets'
const sourcemap = false

export default [
{
  input,
  output: {
    file: 'dist/sharedstreets.mjs',
    format: 'es',
    sourcemap
  },
  plugins: [node(), typescript()]
},
{
  input,
  output: {
    file: 'dist/sharedstreets.js',
    format: 'cjs',
    name,
    sourcemap
  },
  plugins: [node(), typescript()]
}
]
