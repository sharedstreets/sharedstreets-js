const test = require('ava')
const sharedstreets = require('../index')

test('sharedstreets -- geometry', t => {
  const start = [-74.003388, 40.634538]
  const end = [-74.004107, 40.63406]
  const bearing = 228.890377

  t.is(sharedstreets.geometry(start, end, bearing).id, 'NxPFkg4CrzHeFhwV7Uiq7K')
})
