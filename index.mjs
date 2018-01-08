import * as Base58 from 'bs58'
import { createHash } from 'crypto'
import { getCoord } from '@turf/invariant'
import { point, lineString, round } from '@turf/helpers'

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
  var message = 'Geometry 110.543 45.123'
  var id = generateHash(message)
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
 * Location Reference
 *
 * @param {Point|Array<number>} start Start location reference as a GeoJSON Point or an Array of numbers <longitude, latitude>.
 * @param {Point|Array<number>} end End location reference as a GeoJSON Point or an Array of numbers <longitude, latitude>.
 * @param {number} bearing Compass bearing of the street geometry for the 20 meters immediately following the location reference.
 * @returns {Feature<LineString>} SharedStreets Location Reference
 * @example
 * var start = [-74.003388, 40.634538];
 * var end = [-74.004107, 40.63406];
 * var bearing = 228.890377;
 *
 * var locRef = sharedstreets.locationReference(start, end, bearing);
 * locRef.id // => 'NxPFkg4CrzHeFhwV7Uiq7K'
 */
export function locationReference (start, end, bearing) {
  var message = 'Geometry 110.543 45.123'
  return generateHash(message)
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
 * @param {Object} [options={}] Optional parameters
 * @param {number} [options.osmNodeId] OSM Node Id
 * @param {Array<string>} [options.outboundSegmentIds] Outbound Segment Ids
 * @param {Array<string>} [options.inboundSegmentIds] Inbound Segment Ids
 * @returns {Feature<Point>} SharedStreets Intersection
 * @example
 * var pt = [10, 20];
 * var intersection = sharedstreets.intersection(pt);
 * intersection.id // => '5gRJyF2MT5BBErTyEesQLC'
 */
export function intersection (pt, options) {
  options = options || {}

  // Round decimal precision to 6
  var coord = getCoord(pt)
  var x = round(coord[0], 6)
  var y = round(coord[1], 6)

  // Generate SharedStreets Reference ID
  var id = generateHash('Intersection ' + x + ' ' + y)

  // Add GeoJSON Properties
  var properties = {id: id}
  if (options.osmNodeId) properties.osmNodeId = options.osmNodeId
  if (options.outboundSegmentIds) properties.outboundSegmentIds = options.outboundSegmentIds
  if (options.inboundSegmentIds) properties.inboundSegmentIds = options.inboundSegmentIds

  return point(coord, properties, {id: id})
}

/**
 * Generates Hash for SharedStreets Reference ID
 *
 * @param {string} hashInput Message to hash
 * @returns {string} SharedStreets Reference ID
 * @example
 * sharedstreets.generateHash('Intersection 110 45')
 * // => 'NzUsPtY2FHmqaHuyaVzedp'
 */
export function generateHash (hashInput) {
  // https://github.com/sharedstreets/sharedstreets-builder/issues/5
  // hashInput = encodeURI(hashInput)

  // Java => byte[] bytesOfMessage = hashInput.getBytes("UTF-8");
  // var bytesOfMessage = getBytes(hashInput)
  var bytesOfMessage = Buffer.from(hashInput)

  // Java => MessageDigest md = MessageDigest.getInstance("MD5");
  var bytes = createHash('md5').update(bytesOfMessage).digest()

  // Java => String hash = Base58.encode(bytes);
  return Base58.encode(bytes)
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
