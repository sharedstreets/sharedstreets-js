const fs = require('fs')
const path = require('path')
const glob = require('glob')
const write = require('write-json-file')
const load = require('load-json-file')
const test = require('tape')
const sharedstreets = require('../index')

test('sharedstreets -- geometry', t => {
  const start = [-74.003388, 40.634538]
  const end = [-74.004107, 40.63406]
  const bearing = 228.890377

  t.equal(sharedstreets.geometry(start, end, bearing).id, 'NxPFkg4CrzHeFhwV7Uiq7K')
  t.end()
})

test('sharedstreets -- geometryPbf', t => {
  glob.sync(path.join(__dirname, 'pbf', 'in', '*.geometry.pbf')).forEach(filepath => {
    const {name, base} = path.parse(filepath)
    const buffer = fs.readFileSync(filepath)
    const result = sharedstreets.geometryPbf(buffer)

    const outfile = filepath.replace(path.join('pbf', 'in', base), path.join('pbf', 'out', name + '.json'))
    if (process.env.REGEN) write.sync(outfile, result)
    t.deepEqual(result, load.sync(outfile), name)
  })
  t.end()
})

test('sharedstreets -- geometry.latlonsToCoords', t => {
  const latlons = [40, -74, 50, -80]
  t.deepEqual(sharedstreets.latlonsToCoords(latlons), [[-74, 40], [-80, 50]])
  t.end()
})
