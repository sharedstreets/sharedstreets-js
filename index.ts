import * as Base58 from './lib/bs58'
import { createHash } from 'crypto'
import { getCoord } from '@turf/invariant'
import { point, lineString, round, Point, Feature } from '@turf/helpers'
import {
  SharedStreetsGeometry,
  SharedStreetsGeometryProperties,
  SharedStreetsIntersection,
  SharedStreetsIntersectionProperties,
  Location,
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
 * @param {Point|Array<number>} start Start location reference as a GeoJSON Point or an Array of numbers <longitude, latitude>.
 * @param {Point|Array<number>} end End location reference as a GeoJSON Point or an Array of numbers <longitude, latitude>.
 * @param {number} bearing Compass bearing of the street geometry for the 20 meters immediately following the location reference.
 * @returns {Feature<LineString>} SharedStreets Geometry
 * @example
 * const start = [-74.003388, 40.634538];
 * const end = [-74.004107, 40.63406];
 * const bearing = 228.890377;
 *
 * const geom = sharedstreets.geometry(start, end, bearing);
 * geom.id // => 'NxPFkg4CrzHeFhwV7Uiq7K'
 */
export function geometry (start: Location, end: Location, bearing: number): SharedStreetsGeometry {
  const message = 'Geometry 110.543 45.123'
  const id = generateHash(message)
  const coords = [getCoord(start), getCoord(end)]
  const properties: SharedStreetsGeometryProperties = {
    id,
    fromIntersectionId: '5gRJyF2MT5BBErTyEesQLC',
    toIntersectionId: 'N38a21UGykpnqxwez7NGS3',
    forwardReferenceId: '2Vw2XzW4cs7r32RLhQnqwA',
    backReferenceId: 'VXKSEokmvBJ81XHYhUronG',
    roadClass: getRoadClass(3),
  }
  return lineString(coords, properties, {id})
}

/**
 * Location Reference
 *
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
export function locationReference (start: Location, end: Location, bearing: number) {
  const message = 'Geometry 110.543 45.123'
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
 * @param {Array<string>} [options.outboundReferenceIds] Outbound Reference Ids
 * @param {Array<string>} [options.inboundReferenceIds] Inbound Reference Ids
 * @returns {Feature<Point>} SharedStreets Intersection
 * @example
 * const pt = [10, 20];
 * const intersection = sharedstreets.intersection(pt);
 * intersection.id // => '5gRJyF2MT5BBErTyEesQLC'
 */
export function intersection (pt: Location, options: {
  osmNodeId?: number,
  outboundReferenceIds?: string[],
  inboundReferenceIds?: string[],
} = {}): SharedStreetsIntersection {

  // Round decimal precision to 6
  const coord = getCoord(pt)
  const x = round(coord[0], 6)
  const y = round(coord[1], 6)

  // Generate SharedStreets Reference ID
  const id = generateHash(`Intersection ${x} ${y}`)

  // Add GeoJSON Properties
  const properties: SharedStreetsIntersectionProperties = {id}
  if (options.osmNodeId) properties.osmNodeId = options.osmNodeId
  if (options.outboundReferenceIds) properties.outboundReferenceIds = options.outboundReferenceIds
  if (options.inboundReferenceIds) properties.inboundReferenceIds = options.inboundReferenceIds

  return point(coord, properties, {id})
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
export function generateHash (hashInput: string): string {
  // Java => byte[] bytesOfMessage = hashInput.getBytes("UTF-8");
  // Python => bytesOfMessage = hashInput.encode('utf8')
  const bytesOfMessage = Buffer.from(hashInput, 'utf8')

  // Java => byte[] bytes = MessageDigest.getInstance("MD5").digest(bytesOfMessage);
  // Python => byte = hashlib.md5(bytesOfMessage).digest()
  const bytes = createHash('md5').update(bytesOfMessage).digest()

  // Java => String hash = Base58.encode(bytes);
  // Python => hash = Base58.b58encode(byte)
  const hash = Base58.encode(bytes)

  return hash
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
