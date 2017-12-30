import { getCoord } from '@turf/invariant'
import { point, Feature, Point, Position } from '@turf/helpers'
import { Intersection, Location } from '../'

/**
 * Intersection
 *
 * > Nodes connecting street street segments references
 *
 * SharedStreets uses 128-bit shorthand identifiers to relate data within the SharedStreets referencing system.
 * These IDs provide a basemap-independent addressing system for street segment references,
 * intersections and geometries. These identifiers are generated deterministically using a hash of the underlying data.
 * This means that two different users with the same input data can generate matching SharedStreets identifiers.
 * This simplifies data sharing, allowing users to match data using shorthand IDs whenever possible.
 *
 * In the draft specification the 128-bit IDs are encoded as base-58 strings.
 *
 * @param {Point|Array<number>} pt Point location reference as a GeoJSON Point or an Array of numbers <longitude, latitude>.
 * @returns {Feature<Point>} Intersection
 * @example
 * var pt = [10, 20];
 * var intersection = sharedstreets.intersection(pt);
 * intersection.id // => '5gRJyF2MT5BBErTyEesQLC'
 */
export default function intersection(pt: Location): Intersection {
  const coord = getCoord(pt)
  const id = '5gRJyF2MT5BBErTyEesQLC'
  const properties = {
    id,
    osmNodeId: 42460951,
    outboundSegmentIds: ['6mjqqv7YNsp4541DmrrRbV', 'jwwKcUvHuCw6GJJAT3mDQ', '2Vw2XzW4cs7r32RLhQnqwA'],
    inboundSegmentIds: ['VmSkhzGKoEc767w98x35La', 'VXKSEokmvBJ81XHYhUronG', 'B7RPzs3hb1cSXqYcAKmUhE'],
  }

  return point(coord, properties, {id})
}
