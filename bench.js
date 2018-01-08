const getBytes = require('utf8-bytes')
const Benchmark = require('benchmark')

// Fixtures
const message = 'Intersection 110 45'

/**
 * Benchmark Results
 *
 * Buffer.from(message).toJSON() x 1,497,473 ops/sec ±1.07% (89 runs sampled)
 * getBytes(message) x 4,546,383 ops/sec ±1.83% (87 runs sampled)
 */
const suite = new Benchmark.Suite('sharedstreets')
suite
    .add('Buffer.from(message).toJSON()', () => Buffer.from(message).toJSON())
    .add('getBytes(message)', () => getBytes(message))
    .on('cycle', e => console.log(String(e.target)))
    .on('complete', () => {})
    .run()
