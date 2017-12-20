import { lineString } from '@turf/helpers'
import test from 'ava'
import geometry from '../src/geometry'

test('sharedstreets -- geometry', (t) => {
  const line = lineString([[10, 50], [30, 40]])
  t.is(geometry(line), 'NxPFkg4CrzHeFhwV7Uiq7K')
})
