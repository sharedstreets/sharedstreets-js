const sharedstreets = require('./')
const Benchmark = require('benchmark')

// Fixtures
const message = 'Intersection 110.000000 45.000000'
const coord = [110, 45]
const geom = [[110, 45], [115, 50], [120, 55]]
const locationReferences = [
    sharedstreets.locationReference([-74.00482177734375, 40.741641998291016], {outboundBearing: 208, distanceToNextRef: 9279}),
    sharedstreets.locationReference([-74.005126953125, 40.74085235595703], {inboundBearing: 188})
];
const formOfWay = 'MultipleCarriageway';

sharedstreets.referenceId(locationReferences, formOfWay)
/**
 * Benchmark Results
 *
 * generateHash x 502,728 ops/sec ±3.09% (71 runs sampled)
 * intersectionId x 322,772 ops/sec ±3.84% (79 runs sampled)
 * geometryId x 183,952 ops/sec ±4.09% (83 runs sampled)
 * referenceId x 358,905 ops/sec ±1.57% (85 runs sampled)
 */
const suite = new Benchmark.Suite('sharedstreets')
suite
    .add('generateHash', () => sharedstreets.generateHash(message))
    .add('intersectionId', () => sharedstreets.intersectionId(coord))
    .add('geometryId', () => sharedstreets.geometryId(geom))
    .add('referenceId', () => sharedstreets.referenceId(locationReferences, formOfWay))
    .on('cycle', e => console.log(String(e.target)))
    .on('complete', () => {})
    .run()
