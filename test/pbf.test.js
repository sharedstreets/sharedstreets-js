const fs = require('fs')
const test = require('tape')
const path = require('path')
const glob = require('glob')
const write = require('write-json-file')
const load = require('load-json-file')
const Pbf = require('../lib/pbf')

// Intersection
test('sharedstreets -- pbf.intersection', t => {
  glob.sync(path.join(__dirname, 'pbf', 'in', '*.intersection.pbf')).forEach(filepath => {
    const {name, base} = path.parse(filepath)
    const buffer = fs.readFileSync(filepath)
    const result = []
    new Pbf(buffer).readFields((tag, data, pbf) => {
      switch (tag) {
        case 1:
          data.id = pbf.readString()
          break
        case 2:
          data.nodeId = pbf.readVarint64()
          break
        case 3:
          data.lat = pbf.readFloat()
          break
        case 4:
          data.lon = pbf.readFloat()
          break
        case 5:
          data.inboundReferenceIds.push(pbf.readString())
          break
        case 6:
          data.outboundReferenceIds.push(pbf.readString())
          break
        default:
          if (data.id) result.push(data)
          data.id = undefined
          data.nodeId = undefined
          data.lat = undefined
          data.lon = undefined
          data.inboundReferenceIds = []
          data.outboundReferenceIds = []
      }
    }, {})
    const outfile = filepath.replace(path.join('pbf', 'in', base), path.join('pbf', 'out', name + '.json'))
    if (process.env.REGEN) write.sync(outfile, result)
    t.deepEqual(result, load.sync(outfile), name)
  })
  t.end()
})
