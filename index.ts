import { createHash } from 'crypto'
import { getCoord, getCoords } from '@turf/invariant'
import {
  point, lineString, featureCollection,
  Point, LineString, Feature, FeatureCollection, Units,
} from '@turf/helpers'
import {
  SharedStreetsGeometry,
  SharedStreetsIntersection,
  SharedStreetsMetadata,
  SharedStreetsReference,
  RoadClass,
  FormOfWay,
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
 * geom.id // => 'ce9c0ec1472c0a8bab3190ab075e9b21'
 */
export function geometry (
  line: Feature<LineString> | LineString | number[][],
  options: {
    fromIntersectionId?: string,
    toIntersectionId?: string,
    forwardReferenceId?: string,
    backReferenceId?: string,
    roadClass?: RoadClass,
  } = {},
): Feature<LineString, SharedStreetsGeometry> {
  // SharedStreets Geometry Java Implementation
  // https://github.com/sharedstreets/sharedstreets-builder/blob/e5dd30da787f/src/main/java/io/sharedstreets/data/SharedStreetsGeometry.java#L98-L108

  // Round decimal precision to 6
  const coords = getCoords(line)

  // Generate SharedStreets Reference ID from message
  const message = 'Geometry ' + coords.map(([x, y]) => `${x.toFixed(6)} ${y.toFixed(6)}`).join(' ')
  const id = generateHash(message)

  // Include extra properties & Reference ID to GeoJSON Properties
  const properties: SharedStreetsGeometry = {id}
  if (options.fromIntersectionId) properties.fromIntersectionId = options.fromIntersectionId
  if (options.toIntersectionId) properties.toIntersectionId = options.toIntersectionId
  if (options.forwardReferenceId) properties.forwardReferenceId = options.forwardReferenceId
  if (options.backReferenceId) properties.backReferenceId = options.backReferenceId
  if (options.roadClass) properties.roadClass = options.roadClass

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
 * @param {number} [options.nodeId] Node Id
 * @param {Array<string>} [options.outboundReferenceIds] Outbound Reference Ids
 * @param {Array<string>} [options.inboundReferenceIds] Inbound Reference Ids
 * @returns {Feature<Point>} SharedStreets Intersection
 * @example
 * const pt = [110, 45];
 * const intersection = sharedstreets.intersection(pt);
 * intersection.id // => '71f34691f182a467137b3d37265cb3b6'
 */
export function intersection (
  pt: number[] | Feature<Point> | Point,
  options: {
    nodeId?: number,
    outboundReferenceIds?: string[],
    inboundReferenceIds?: string[],
  } = {},
): Feature<Point, SharedStreetsIntersection> {
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
  const properties: SharedStreetsIntersection = {id}
  if (options.nodeId) properties.nodeId = options.nodeId
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
 * // => '71f34691f182a467137b3d37265cb3b6'
 */
export function generateHash (message: string): string {
  return createHash('md5').update(message).digest('hex')
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
 * Reference
 *
 * @param {FeatureCollection<Point>|Array<Point>} locationReferences Location References in a form of a GeoJSON FeatureCollection or Array of points.
 * @param {Feature<LineString>} geom Geometry in a form of a GeoJSON LineString
 * @param {string} formOfWay Form Of Way
 * @returns {Feature<LineString>} SharedStreets Location Reference
 * @example
 * const locationReferenceInbound = sharedstreets.locationReference([110, 40]);
 * const locationReferenceOutput = sharedstreets.locationReference([130, 60]);
 * const geom = sharedstreets.geometry([[110, 40], [130, 60]]);
 * const formOfWay = 'Motorway';
 *
 * const ref = sharedstreets.reference([locationReferenceInbound, locationReferenceOutput], geom, formOfWay);
 * ref.id // => 'NxPFkg4CrzHeFhwV7Uiq7K'
 */
export function reference (
  locationReferences: SharedStreetsReference[],
  geom: SharedStreetsGeometry,
  formOfWay: FormOfWay,
): FeatureCollection<Point, SharedStreetsReference> {
  const message = `Reference
    - FormOfWay (Integer)
    Array of LocationReferences:
      - x (Float 6 fixed)
      - y (Float 6 fixed)
      - bearing (Round Integer)
      - distance (Round Integer/ Centimers)
  `
  const id = generateHash(message)

  return {
    id,
    type: 'FeatureCollection',
    geometryId: 'foo',
    locationReferences: ['hello', 'world'],
    formOfWay: 'Motorway',
    features: locationReferences,
  }
}

/**
 * Location Reference
 *
 * @private
 * @param {Feature<Point>|Array<number>} intersect Intersection as a GeoJSON Point or an Array of numbers <longitude, latitude>.
 * @param {Object} [options={}] Optional parameters
 * @param {string} [options.intersectionId] Intersection Id - Fallbacks to input's point `id` or generates Intersection Id.
 * @param {number} [options.inboundBearing] Inbound bearing of the street geometry for the 20 meters immediately following the location reference.
 * @param {number} [options.outboundBearing] Outbound bearing.
 * @param {number} [options.distanceToNextRef] Distance to next Location Reference (distance defined in centimeters).
 * @param {string} [options.units='centimeters'] Define a different input distance measurement (ex: kilometers, meters, miles).
 * @returns {Feature<LineString>} SharedStreets Location Reference
 * @example
 * const intersect = sharedstreets.intersection([-74.003388, 40.634538]);
 *
 * const locRef = sharedstreets.locationReference(intersect);
 * locRef.id // => 'NxPFkg4CrzHeFhwV7Uiq7K'
 */
export function locationReference (
  intersect: number[] | Feature<Point> | Point,
  options: {
    intersectionId?: string,
    inboundBearing?: number,
    outboundBearing?: number,
    distanceToNextRef?: number,
    units?: Units,
} = {}): SharedStreetsReference {
  // SharedStreets Intersection Java Implementation
  // https://github.com/sharedstreets/sharedstreets-builder/blob/master/src/main/java/io/sharedstreets/data/SharedStreetsLocationReference.java
  const coord = getCoord(intersect)

  // Retrieve ID from SharedStreets Intersection, fallbacks to generating a new ID
  let intersectionId
  if (Array.isArray(intersect)) intersectionId = intersection(coord)
  else if (intersect.type === 'Point') intersectionId = intersection(coord)
  else if (intersect.id) intersectionId = intersect.id
  else if (intersect.properties.id) intersectionId = intersect.properties.id
  else throw new Error('intersectionId was not found')

  // Include extra properties & Reference ID to GeoJSON Properties
  const properties: SharedStreetsReference = {intersectionId}
  if (options.inboundBearing) properties.inboundBearing = options.inboundBearing
  if (options.outboundBearing) properties.outboundBearing = options.outboundBearing
  if (options.distanceToNextRef) properties.distanceToNextRef = options.distanceToNextRef

  return point(coord, properties, {})
}
