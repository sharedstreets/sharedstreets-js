import * as Base58 from './lib/base58'
import { createHash } from 'crypto'
import { getCoord, getCoords } from '@turf/invariant'
import { point, lineString, Point, LineString, Feature } from '@turf/helpers'
import {
  SharedStreetsGeometry,
  SharedStreetsGeometryProperties,
  SharedStreetsIntersection,
  SharedStreetsIntersectionProperties,
  SharedStreetsRoadClass,
} from 'sharedstreets-types'

/**
 * Geometry
 *
 * SharedStreets Geometries are street centerline data derived from the basemap used to
 * produce SharedStreets References. A single geometry is shared by each set of forward and back references.
 *
 * SharedStreets is premised on the idea that there's no one correct geometry for a given street.
 * Just as street references can be generated from any basemap, street geometries can be derived from any data source.
 *
 * @param {Feature<LineString>|Array<Array<number>>} line Line Geometry as a GeoJSON LineString or an Array of Positions Array<<longitude, latitude>>.
 * @param {Object} [options={}] Optional parameters
 * @param {string} [options.fromIntersectionId] From Intersection SharedStreets Reference ID
 * @param {string} [options.toIntersectionId] To Intersection SharedStreets Reference ID
 * @param {string} [options.forwardReferenceId] Forward SharedStreets Reference ID
 * @param {string} [options.backwardReferenceId] Backward SharedStreets Reference ID
 * @param {string|number} [options.roadClass] Road Class as number or full string name ('Motorway', 'Residential', etc...)
 * @returns {Feature<LineString>} SharedStreets Geometry
 * @example
 * const line = [[110, 45], [115, 50], [120, 55]]
 * const geom = sharedstreets.geometry(line)
 * geom.id // => 'SWkr931VN89aHemb4L7MDS'
 */
export function geometry (
  line: Feature<LineString> | LineString | number[][],
  options: {
    fromIntersectionId?: string,
    toIntersectionId?: string,
    forwardReferenceId?: string,
    backReferenceId?: string,
    roadClass?: number | SharedStreetsRoadClass,
  } = {},
): SharedStreetsGeometry {
  // SharedStreets Geometry Java Implementation
  // https://github.com/sharedstreets/sharedstreets-builder/blob/e5dd30da787f/src/main/java/io/sharedstreets/data/SharedStreetsGeometry.java#L98-L108

  // Round decimal precision to 6
  const coords = getCoords(line)

  // Generate SharedStreets Reference ID from message
  const message = 'Geometry ' + coords.map(([x, y]) => `${x.toFixed(6)} ${y.toFixed(6)}`).join(' ')
  const id = generateHash(message)

  // Include extra properties & Reference ID to GeoJSON Properties
  const properties: SharedStreetsGeometryProperties = {id}
  if (options.fromIntersectionId) properties.fromIntersectionId = options.fromIntersectionId
  if (options.toIntersectionId) properties.toIntersectionId = options.toIntersectionId
  if (options.forwardReferenceId) properties.forwardReferenceId = options.forwardReferenceId
  if (options.backReferenceId) properties.backReferenceId = options.backReferenceId
  if (options.roadClass) properties.roadClass = typeof options.roadClass === 'number' ? getRoadClass(options.roadClass) : options.roadClass

  return lineString(coords, properties, {id})
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
 * @param {Feature<Point>|Array<number>} pt Point location reference as a GeoJSON Point or an Array of numbers <longitude, latitude>.
 * @param {Object} [options={}] Optional parameters
 * @param {number} [options.osmNodeId] OSM Node Id
 * @param {Array<string>} [options.outboundReferenceIds] Outbound Reference Ids
 * @param {Array<string>} [options.inboundReferenceIds] Inbound Reference Ids
 * @returns {Feature<Point>} SharedStreets Intersection
 * @example
 * const pt = [110, 45];
 * const intersection = sharedstreets.intersection(pt);
 * intersection.id // => 'F585H3jn72yicbJhf4791w'
 */
export function intersection (
  pt: number[] | Feature<Point> | Point,
  options: {
    osmNodeId?: number,
    outboundReferenceIds?: string[],
    inboundReferenceIds?: string[],
  } = {},
): SharedStreetsIntersection {
  // SharedStreets Intersection Java Implementation
  // https://github.com/sharedstreets/sharedstreets-builder/blob/master/src/main/java/io/sharedstreets/data/SharedStreetsIntersection.java

  // Round decimal precision to 6
  const coord = getCoord(pt)
  const x = coord[0].toFixed(6)
  const y = coord[1].toFixed(6)

  // Generate SharedStreets Reference ID from message
  const message = `Intersection ${x} ${y}`
  const id = generateHash(message)

  // Include extra properties & Reference ID to GeoJSON Properties
  const properties: SharedStreetsIntersectionProperties = {id}
  if (options.osmNodeId) properties.osmNodeId = options.osmNodeId
  if (options.outboundReferenceIds) properties.outboundReferenceIds = options.outboundReferenceIds
  if (options.inboundReferenceIds) properties.inboundReferenceIds = options.inboundReferenceIds

  return point(coord, properties, {id})
}

/**
 * Generates Hash for SharedStreets Reference ID
 *
 * @param {string} message Message to hash
 * @returns {string} SharedStreets Reference ID
 * @example
 * sharedstreets.generateHash('Intersection 110.000000 45.000000')
 * // => 'F585H3jn72yicbJhf4791w'
 */
export function generateHash (message: string): string {
  // Java => byte[] bytesOfMessage = message.getBytes("UTF-8");
  // Python => bytesOfMessage = message.encode('utf8')
  const bytesOfMessage = Buffer.from(message, 'utf8')

  // Java => byte[] bytes = MessageDigest.getInstance("MD5").digest(bytesOfMessage);
  // Python => byte = hashlib.md5(bytesOfMessage).digest()
  const bytes = createHash('md5').update(bytesOfMessage).digest()

  // Java => return Base58.encode(bytes);
  // Python => return base58.b58encode(byte)
  return Base58.encode(bytes)
}

/**
 * getRoadClass
 *
 * @param {number} value Number value [between 0-8]
 * @returns {string} Road Class
 * @example
 * sharedstreets.getRoadClass(0) // => 'Motorway'
 * sharedstreets.getRoadClass(5) // => 'Residential'
 */
export function getRoadClass (value: number) {
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
    default: throw new Error(`[${value}] unknown RoadClass value`)
  }
}

/**
 * getFormOfWay
 *
 * @param {number} value Number value [between 0-8]
 * @returns {string} Form of Way
 * @example
 * sharedstreets.getFormOfWay(0) // => 'Undefined'
 * sharedstreets.getFormOfWay(5) // => 'TrafficSquare'
 */
export function getFormOfWay (value: number) {
  switch (value) {
    case 0: { return 'Undefined' }
    case 1: { return 'Motorway' }
    case 2: { return 'MultipleCarriageway' }
    case 3: { return 'SingleCarriageway' }
    case 4: { return 'Roundabout' }
    case 5: { return 'TrafficSquare' }
    case 6: { return 'SlipRoad' }
    case 7: { return 'Other' }
    default: throw new Error(`[${value}] unknown FormOfWay value`)
  }
}

/**
 * Location Reference (UNDER DEVELOPMENT)
 *
 * @private
 * @param {Point|Array<number>} start Start location reference as a GeoJSON Point or an Array of numbers <longitude, latitude>.
 * @param {Point|Array<number>} end End location reference as a GeoJSON Point or an Array of numbers <longitude, latitude>.
 * @param {number} bearing Compass bearing of the street geometry for the 20 meters immediately following the location reference.
 * @returns {Feature<LineString>} SharedStreets Location Reference
 * @example
 * const start = [-74.003388, 40.634538];
 * const end = [-74.004107, 40.63406];
 * const bearing = 228.890377;
 *
 * const locRef = sharedstreets.locationReference(start, end, bearing);
 * locRef.id // => 'NxPFkg4CrzHeFhwV7Uiq7K'
 */
// export function locationReference (start: Location, end: Location, bearing: number) {
//   const message = 'Geometry 110.543 45.123'
//   return generateHash(message)
// }
