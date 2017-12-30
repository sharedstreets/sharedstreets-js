import test from 'ava'
import * as sharedstreets from '../index'

test('sharedstreets -- intersection', t => {
  const start = [-74.003388, 40.634538]
  const end = [-74.004107, 40.63406]

  t.is(sharedstreets.intersection(start).id, '5gRJyF2MT5BBErTyEesQLC')
})
