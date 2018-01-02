const fs = require('fs')
const test = require('tape')
const path = require('path')
const glob = require('glob')
const write = require('write-json-file')
const load = require('load-json-file')
const sharedstreets = require('../index')

// Intersection
test('sharedstreets -- intersectionPbf', t => {
  glob.sync(path.join(__dirname, 'pbf', 'in', '*.intersection.pbf')).forEach(filepath => {
    const {name, base} = path.parse(filepath)
    const buffer = fs.readFileSync(filepath)
    const result = sharedstreets.intersectionPbf(buffer)

    const outfile = filepath.replace(path.join('pbf', 'in', base), path.join('pbf', 'out', name + '.json'))
    if (process.env.REGEN) write.sync(outfile, result)
    t.deepEqual(result, load.sync(outfile), name)
  })
  t.end()
})
