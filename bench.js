const sharedstreets = require('./')
const Benchmark = require('benchmark')

// Fixtures
const message = 'Intersection 110.000000 45.000000'
const coord = [110, 45]
const geom = [[110, 45], [115, 50], [120, 55]]

/**
 * Benchmark Results
 *
 * generateHash x 172,742 ops/sec ±2.18% (88 runs sampled)
 * intersection x 120,711 ops/sec ±1.79% (80 runs sampled)
 * geometry x 60,542 ops/sec ±14.37% (68 runs sampled)
 */
const suite = new Benchmark.Suite('sharedstreets')
suite
    .add('generateHash', () => sharedstreets.generateHash(message))
    .add('intersection', () => sharedstreets.intersection(coord))
    .add('geometry', () => sharedstreets.geometry(geom))
    .on('cycle', e => console.log(String(e.target)))
    .on('complete', () => {})
    .run()
