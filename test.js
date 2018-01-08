const test = require('tape')
const sharedstreets = require('./index')
const { createHash } = require('crypto')

// test('sharedstreets -- geometry', t => {
//   const start = [-74.003388, 40.634538]
//   const end = [-74.004107, 40.63406]
//   const bearing = 228.890377

//   t.equal(sharedstreets.geometry(start, end, bearing).id, 'NxPFkg4CrzHeFhwV7Uiq7K')
//   t.end()
// })

test('sharedstreets -- intersection', t => {
  const coord1 = [110, 45]
  const coord2 = [-74.003388, 40.634538]
  const coord3 = [-74.004107, 40.63406]

  t.equal(sharedstreets.intersection(coord1).id, 'NzUsPtY2FHmqaHuyaVzedp', 'intersection => coord1')
  t.equal(sharedstreets.intersection(coord2).id, '31H4rsFQijyBvkTSfoRYKP', 'intersection => coord2')
  t.equal(sharedstreets.intersection(coord3).id, 'Df9nXgEtuHrCb8XJCtsr99', 'intersection => coord3')
  t.end()
})

test('sharedstreets -- generateHash', t => {
  const message1 = 'Intersection 110 45'
  const message2 = 'Intersection -74.003388 40.634538'
  const message3 = 'Intersection -74.004107 40.63406'

  // Java => public void generateHash(String hashInput)
  t.equal(sharedstreets.generateHash(message1), 'NzUsPtY2FHmqaHuyaVzedp', 'generateHash => message1')
  t.equal(sharedstreets.generateHash(message2), '31H4rsFQijyBvkTSfoRYKP', 'generateHash => message2')
  t.equal(sharedstreets.generateHash(message3), 'Df9nXgEtuHrCb8XJCtsr99', 'generateHash => message3')

  // Java => hashInput.getBytes("UTF-8")
  const bytesOfMessage1 = Buffer.from(message1)
  const bytesOfMessage2 = Buffer.from(message2)
  const bytesOfMessage3 = Buffer.from(message3)

  t.deepEqual(bytesOfMessage1, Buffer.from([73, 110, 116, 101, 114, 115, 101, 99, 116, 105, 111, 110, 32, 49, 49, 48, 32, 52, 53]), 'Buffer.from => bytesOfMessage1')
  t.deepEqual(bytesOfMessage2, Buffer.from([73, 110, 116, 101, 114, 115, 101, 99, 116, 105, 111, 110, 32, 45, 55, 52, 46, 48, 48, 51, 51, 56, 56, 32, 52, 48, 46, 54, 51, 52, 53, 51, 56]), 'Buffer.from => bytesOfMessage2')
  t.deepEqual(bytesOfMessage3, Buffer.from([73, 110, 116, 101, 114, 115, 101, 99, 116, 105, 111, 110, 32, 45, 55, 52, 46, 48, 48, 52, 49, 48, 55, 32, 52, 48, 46, 54, 51, 52, 48, 54]), 'Buffer.from => bytesOfMessage3')

  // Java => MessageDigest md = MessageDigest.getInstance("MD5");
  const bytes1 = createHash('md5').update(bytesOfMessage1).digest()
  const bytes2 = createHash('md5').update(bytesOfMessage2).digest()
  const bytes3 = createHash('md5').update(bytesOfMessage3).digest()

  t.deepEqual(bytes1, Buffer.from([-78, 22, 123, 71, 13, -91, 59, -56, 75, -70, -13, -80, 19, 93, 98, -45]), 'createHash => bytes1')
  t.deepEqual(bytes2, Buffer.from([16, 60, 45, -66, 22, -46, -116, -36, -36, -43, -27, -30, 83, -22, -96, 38]), 'createHash => bytes2')
  t.deepEqual(bytes3, Buffer.from([102, -127, 87, 83, 111, 18, 70, -123, 25, -53, -66, -106, 107, -46, -67, -36]), 'createHash => bytes3')
  t.end()
})
