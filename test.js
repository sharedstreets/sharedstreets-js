const assert = require('assert')
const sharedstreets = require('./')

// fixtures
const message1 = 'Intersection 110.000000 45.000000'
const message2 = 'Intersection -74.003388 40.634538'
const message3 = 'Intersection -74.004107 40.634060'
const coord1 = [110, 45]
const coord2 = [-74.003388, 40.634538]
const coord3 = [-74.004107, 40.63406]
const geom1 = [[110, 45], [115, 50], [120, 55]]
const geom2 = [[-74.007568359375, 40.75239562988281], [-74.00729370117188, 40.753089904785156]]
const geom3 = [[-74.00778198242188, 40.72457504272461], [-74.0076675415039, 40.72519302368164]]

// generateHash
assert.equal(sharedstreets.generateHash(message1), 'F585H3jn72yicbJhf4791w', 'generateHash => message1')
assert.equal(sharedstreets.generateHash(message2), '31H4rsFQijyBvkTSfoRYKP', 'generateHash => message2')
assert.equal(sharedstreets.generateHash(message3), '2su5qcfh1QgXkTLXcMGbU9', 'generateHash => message3')

// geometry
assert.equal(sharedstreets.geometry(geom1).id, 'SWkr931VN89aHemb4L7MDS', 'geometry => geom1')
assert.equal(sharedstreets.geometry(geom2).id, 'L6UL4SQSnKAM7vU1HpLGG', 'geometry => geom2')
assert.equal(sharedstreets.geometry(geom3).id, 'Bx91v4fCvcMFiwd2Mrptio', 'geometry => geom3')

// intersection
assert.equal(sharedstreets.intersection(coord1).id, 'F585H3jn72yicbJhf4791w', 'intersection => coord1')
assert.equal(sharedstreets.intersection(coord2).id, '31H4rsFQijyBvkTSfoRYKP', 'intersection => coord2')
assert.equal(sharedstreets.intersection(coord3).id, '2su5qcfh1QgXkTLXcMGbU9', 'intersection => coord3')
