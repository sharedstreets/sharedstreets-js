import { getCoord } from '@turf/invariant'
import { point, lineString } from '@turf/helpers'

/**
 * Geometry
 *
 * SharedStreets Geometries are street centerline data derived from the basemap used to
 * produce SharedStreets References. A single geometry is shared by each set of forward and back references.
 *
 * SharedStreets is premised on the idea that there's no one correct geometry for a given street.
 * Just as street references can be generated from any basemap, street geometries can be derived from any data source.
 *
 * @param {Point|Array<number>} start Start location reference as a GeoJSON Point or an Array of numbers <longitude, latitude>.
 * @param {Point|Array<number>} end End location reference as a GeoJSON Point or an Array of numbers <longitude, latitude>.
 * @param {number} bearing Compass bearing of the street geometry for the 20 meters immediately following the location reference.
 * @returns {Feature<LineString>} SharedStreets Geometry
 * @example
 * var start = [-74.003388, 40.634538];
 * var end = [-74.004107, 40.63406];
 * var bearing = 228.890377;
 *
 * var geom = sharedstreets.geometry(start, end, bearing);
 * geom.id // => 'NxPFkg4CrzHeFhwV7Uiq7K'
 */
export function geometry (start, end, bearing) {
  var id = 'NxPFkg4CrzHeFhwV7Uiq7K'
  var coords = [getCoord(start), getCoord(end)]
  var properties = {
    id: id,
    fromIntersectionId: '5gRJyF2MT5BBErTyEesQLC',
    toIntersectionId: 'N38a21UGykpnqxwez7NGS3',
    forwardReferenceId: '2Vw2XzW4cs7r32RLhQnqwA',
    backReferenceId: 'VXKSEokmvBJ81XHYhUronG',
    roadClass: getRoadClass(3)
  }
  return lineString(coords, properties, {id: id})
}

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
export function intersection (pt) {
  var coord = getCoord(pt)
  var id = '5gRJyF2MT5BBErTyEesQLC'
  var properties = {
    id: id,
    osmNodeId: 42460951,
    outboundSegmentIds: ['6mjqqv7YNsp4541DmrrRbV', 'jwwKcUvHuCw6GJJAT3mDQ', '2Vw2XzW4cs7r32RLhQnqwA'],
    inboundSegmentIds: ['VmSkhzGKoEc767w98x35La', 'VXKSEokmvBJ81XHYhUronG', 'B7RPzs3hb1cSXqYcAKmUhE']
  }

  return point(coord, properties, {id: id})
}

export function getRoadClass (value) {
  switch (value) {
    case 0: { return 'Motorway' }
    case 1: { return 'Trunk' }
    case 2: { return 'Primary' }
    case 3: { return 'Secondary' }
    case 4: { return 'Tertiary' }
    case 5: { return 'Residential' }
    case 6: { return 'Unclassified' }
    case 7: { return 'Service' }
    case 8: { return 'Other' }
    default: throw new Error('[' + value + '] unknown RoadClass value')
  }
}

export function getFormOfWay (value) {
  switch (value) {
    case 0: { return 'Undefined' }
    case 1: { return 'Motorway' }
    case 2: { return 'MultipleCarriageway' }
    case 3: { return 'SingleCarriageway' }
    case 4: { return 'Roundabout' }
    case 5: { return 'TrafficSquare' }
    case 6: { return 'SlipRoad' }
    case 7: { return 'Other' }
    default: throw new Error('[' + value + '] unknown FormOfWay value')
  }
}
