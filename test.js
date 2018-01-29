const fs = require('fs')
const path = require('path')
const glob = require('glob')
const test = require('tape')
const sharedstreetsPbf = require('sharedstreets-pbf')
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

test('sharedstreets -- generateHash', t => {
  t.equal(sharedstreets.generateHash(message1), '71f34691f182a467137b3d37265cb3b6', 'generateHash => message1')
  t.equal(sharedstreets.generateHash(message2), '103c2dbe16d28cdcdcd5e5e253eaa026', 'generateHash => message2')
  t.equal(sharedstreets.generateHash(message3), '0f346cb98b5d8f0500e167cb0a390266', 'generateHash => message3')
  t.end()
})

test('sharedstreets -- geometry', t => {
  t.equal(sharedstreets.geometryId(line1), 'ce9c0ec1472c0a8bab3190ab075e9b21', 'geometryId => line1')
  t.equal(sharedstreets.geometryId(line2), '02aa80dc9c72ea4175bfb10c05e5a2b9', 'geometryId => line2')
  t.equal(sharedstreets.geometryId(line3), '58ae3bdd54f99e0331a8cb147557adcc', 'geometryId => line3')

  t.equal(sharedstreets.geometryMessage(line1), 'Geometry 110.000000 45.000000 115.000000 50.000000 120.000000 55.000000', 'geometryMessage => line1')
  t.equal(sharedstreets.geometryMessage(line2), 'Geometry -74.007568 40.752396 -74.007294 40.753090', 'geometryMessage => line2')
  t.equal(sharedstreets.geometryMessage(line3), 'Geometry -74.007782 40.724575 -74.007668 40.725193', 'geometryMessage => line3')

  // Extras
  // https://github.com/sharedstreets/sharedstreets-pbf/blob/master/test/out/11-602-769.geometry.json
  const coords1 = sharedstreets.lonlatsToCoords([
    -74.008536,
    40.744171900000005,
    -74.0085628,
    40.7440325,
    -74.0085895,
    40.7438948,
    -74.0086801,
    40.7434298,
    -74.0087517,
    40.743065300000005
  ])
  const coords2 = sharedstreets.lonlatsToCoords([
    -74.007399,
    40.73337,
    -74.007025,
    40.733334
  ])
  t.equal(sharedstreets.geometryMessage(coords1), 'Geometry -74.008536 40.744172 -74.008563 40.744033 -74.008590 40.743895 -74.008680 40.743430 -74.008752 40.743065', 'message => coords1')
  t.equal(sharedstreets.geometryId(coords1), '8e1b6416c8931954511b4a175c737059', 'id => coords1')

  t.equal(sharedstreets.geometryMessage(coords2), 'Geometry -74.007399 40.733370 -74.007025 40.733334', 'message => coords2')
  t.equal(sharedstreets.geometryId(coords2), '8e2f3977a03a0723cf1cd46d37244427', 'id => coords2')
  t.end()
})

test('sharedstreets -- intersection', t => {
  t.equal(sharedstreets.intersectionId(pt1), '71f34691f182a467137b3d37265cb3b6', 'intersectionId => pt1')
  t.equal(sharedstreets.intersectionId(pt2), '103c2dbe16d28cdcdcd5e5e253eaa026', 'intersectionId => pt2')
  t.equal(sharedstreets.intersectionId(pt3), '0f346cb98b5d8f0500e167cb0a390266', 'intersectionId => pt3')

  t.equal(sharedstreets.intersectionMessage(pt1), 'Intersection 110.000000 45.000000', 'intersectionMessage => pt1')
  t.equal(sharedstreets.intersectionMessage(pt2), 'Intersection -74.003388 40.634538', 'intersectionMessage => pt2')
  t.equal(sharedstreets.intersectionMessage(pt3), 'Intersection -74.004107 40.634060', 'intersectionMessage => pt3')

  // Extras
  t.equal(sharedstreets.intersectionId([-74.00962750000001, 40.740100500000004]), '803182394d597ae26d70807a89ed400c', 'intersectionId => extra1')
  t.equal(sharedstreets.intersectionMessage([-74.00962750000001, 40.740100500000004]), 'Intersection -74.009628 40.740101', 'intersectionMessage => extra1')
  t.end()
})

test('sharedstreets -- referenceId', t => {
  const locationReferenceOutbound = sharedstreets.locationReference([-74.0048213, 40.7416415], {outboundBearing: 208, distanceToNextRef: 9279})
  const locationReferenceInbound = sharedstreets.locationReference([-74.0051265, 40.7408505], {inboundBearing: 188})
  const formOfWay = 2; // => 'MultipleCarriageway'

  t.equal(sharedstreets.referenceMessage([locationReferenceOutbound, locationReferenceInbound], formOfWay), 'Reference 2 -74.004821 40.741642 208 927900 -74.005127 40.740851 188.0', 'referenceId => pt1')

  t.equal(locationReferenceOutbound.intersectionId, '69f13f881649cb21ee3b359730790bb9', 'locationReferenceOutbound => intersectionId')
  t.equal(locationReferenceInbound.intersectionId, 'f361178c33988ef9bfc8b51b7545c5fa', 'locationReferenceInbound => intersectionId')

  // Failing (doesn't line up with Java builder)
  t.equal(sharedstreets.referenceId([locationReferenceOutbound, locationReferenceInbound], formOfWay), '41d73e28819470745fa1f93dc46d82a9', 'referenceId => pt1')
  t.end()
})

test('sharedstreets -- locationReference', t => {
  const options = {
    outboundBearing: 208,
    distanceToNextRef: 9279
  };
  const locRef = sharedstreets.locationReference([-74.0048213, 40.7416415], options);

  t.equal(locRef.intersectionId, '69f13f881649cb21ee3b359730790bb9', 'locRef => intersectionId')
  t.end()
})

test('sharedstreets-pbf -- intersection', t => {
  glob.sync(path.join(__dirname, 'test', 'in', `*.intersection.pbf`)).forEach(filepath => {
    const {name, base} = path.parse(filepath)
    const buffer = fs.readFileSync(filepath)
    const intersections = sharedstreetsPbf.intersection(buffer)

    intersections.forEach(({lon, lat, id}) => {
      if (sharedstreets.intersectionId([lon, lat]) !== id) t.error(`[${lon},${lat}] => ${id}`)
    })
  })
  t.end()
})
