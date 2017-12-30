const fs = require('fs')
const path = require('path')
const glob = require('glob')
const { VectorTile } = require('@mapbox/vector-tile')
const Protobuf = require('pbf')

glob.sync(path.join(__dirname, '*.pbf')).forEach(filepath => {
  const data = fs.readFileSync(filepath)
  const tile = new VectorTile(new Protobuf(data))
  console.log(Object.keys(tile.layers.null))
  console.log(tile.layers.null.name)
})
