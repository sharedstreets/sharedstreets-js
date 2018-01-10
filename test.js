const test = require('tape')
const sharedstreets = require('./')

// fixtures
const message1 = 'Intersection 110.000000 45.000000'
const message2 = 'Intersection -74.003388 40.634538'
const message3 = 'Intersection -74.004107 40.634060'
const pt1 = [110, 45]
const pt2 = [-74.003388, 40.634538]
const pt3 = [-74.004107, 40.63406]
const line1 = [[110, 45], [115, 50], [120, 55]]
const line2 = [[-74.007568359375, 40.75239562988281], [-74.00729370117188, 40.753089904785156]]
const line3 = [[-74.00778198242188, 40.72457504272461], [-74.0076675415039, 40.72519302368164]]

// generateHash
test('sharedstreets -- generateHash', t => {
  t.equal(sharedstreets.generateHash(message1), '71f34691f182a467137b3d37265cb3b6', 'generateHash => message1')
  t.equal(sharedstreets.generateHash(message2), '103c2dbe16d28cdcdcd5e5e253eaa026', 'generateHash => message2')
  t.equal(sharedstreets.generateHash(message3), '0f346cb98b5d8f0500e167cb0a390266', 'generateHash => message3')
  t.end()
})

test('sharedstreets -- geometry', t => {
  t.equal(sharedstreets.geometry(line1).id, 'ce9c0ec1472c0a8bab3190ab075e9b21', 'geometry => line1')
  t.equal(sharedstreets.geometry(line2).id, '02aa80dc9c72ea4175bfb10c05e5a2b9', 'geometry => line2')
  t.equal(sharedstreets.geometry(line3).id, '58ae3bdd54f99e0331a8cb147557adcc', 'geometry => line3')
  t.end()
})

test('sharedstreets -- intersection', t => {
  t.equal(sharedstreets.intersection(pt1).id, '71f34691f182a467137b3d37265cb3b6', 'intersection => pt1')
  t.equal(sharedstreets.intersection(pt2).id, '103c2dbe16d28cdcdcd5e5e253eaa026', 'intersection => pt2')
  t.equal(sharedstreets.intersection(pt3).id, '0f346cb98b5d8f0500e167cb0a390266', 'intersection => pt3')
  t.end()
})
