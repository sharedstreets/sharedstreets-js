import { createHash } from 'crypto'
import { getCoord, getCoords } from '@turf/invariant'
import {
  // point, lineString,
  Point, LineString, Feature,
} from '@turf/helpers'
import {
  // SharedStreetsGeometry,
  // SharedStreetsIntersection,
  // SharedStreetsMetadata,
  // SharedStreetsReference,
  LocationReference,
  // RoadClass,
  FormOfWay,
} from 'sharedstreets-types'

/**
 * Geometry Id
 *
 * SharedStreets Geometry Java Implementation
 * https://github.com/sharedstreets/sharedstreets-builder/blob/master/src/main/java/io/sharedstreets/data/SharedStreetsGeometry.java#L98-L108
 *
 * @param {Feature<LineString>|Array<Array<number>>} line Line Geometry as a GeoJSON LineString or an Array of Positions Array<<longitude, latitude>>.
 * @returns {string} SharedStreets Geometry Id
 * @example
 * sharedstreets.geometryId([[110, 45], [115, 50], [120, 55]]);
 * // => 'ce9c0ec1472c0a8bab3190ab075e9b21'
 */
export function geometryId (line: Feature<LineString> | LineString | number[][]): string {
  const coords = getCoords(line)
  const message = 'Geometry ' + coords.map(([x, y]) => `${x.toFixed(6)} ${y.toFixed(6)}`).join(' ')
  return generateHash(message)
}

/**
 * Intersection Id
 *
 * SharedStreets Intersection Java Implementation
 * https://github.com/sharedstreets/sharedstreets-builder/blob/master/src/main/java/io/sharedstreets/data/SharedStreetsIntersection.java#L42-L49
 *
 * @param {Feature<Point>|Array<number>} pt Point location reference as a GeoJSON Point or an Array of numbers <longitude, latitude>.
 * @returns {string} SharedStreets Intersection Id
 * @example
 * sharedstreets.intersectionId([110, 45]);
 * // => '71f34691f182a467137b3d37265cb3b6'
 */
export function intersectionId(pt: number[] | Feature<Point> | Point): string {
  const [x, y] = getCoord(pt)
  const message = `Intersection ${x.toFixed(6)} ${y.toFixed(6)}`
  return generateHash(message)
}

/**
 * Reference Id
 *
 * Shared Streets Reference Java Implementation
 * https://github.com/sharedstreets/sharedstreets-builder/blob/master/src/main/java/io/sharedstreets/data/SharedStreetsReference.java#L323-L340
 *
 * @param {string} formOfWay Form Of Way
 * @param {FeatureCollection<Point>|Array<Point>} locationReferences Location References in a form of a GeoJSON FeatureCollection or Array of points.
 * @returns {string} SharedStreets Reference Id
 * @example
 * const locationReferences = [
 *   sharedstreets.locationReference([-74.00482177734375, 40.741641998291016], {outboundBearing: 208, distanceToNextRef: 9279}),
 *   sharedstreets.locationReference([-74.005126953125, 40.74085235595703], {inboundBearing: 188})
 * ];
 * const formOfWay = 'MultipleCarriageway';
 *
 * sharedstreets.referenceId(locationReferences, formOfWay);
 * // => '41d73e28819470745fa1f93dc46d82a9'
 */
export function referenceId (locationReferences: LocationReference[], formOfWay: FormOfWay): string {
  let message = `Reference ${formOfWay}`
  locationReferences.forEach(lr => {
    if (lr.outboundBearing !== null || lr.outboundBearing !== undefined) {
      message += ` ${Math.round(lr.outboundBearing)}`
      message += ` ${Math.round(lr.distanceToNextRef * 100)}` // store in centimeter
    }
    if (lr.inboundBearing !== null || lr.inboundBearing !== undefined) {
      message += ` ${lr.inboundBearing.toFixed(1)}`
    }
  })
  return generateHash(message)
}

/**
 * Location Reference Id
 *
 * SharedStreets Location Reference Java Implementation
 * https://github.com/sharedstreets/sharedstreets-builder/blob/master/src/main/java/io/sharedstreets/data/SharedStreetsLocationReference.java
 *
 * @private
 * @param {Feature<Point>|Array<number>} pt Point as a GeoJSON Point or an Array of numbers <longitude, latitude>.
 * @param {Object} [options={}] Optional parameters
 * @param {string} [options.intersectionId] Intersection Id - Fallbacks to input's point `id` or generates Intersection Id.
 * @param {number} [options.inboundBearing] Inbound bearing of the street geometry for the 20 meters immediately following the location reference.
 * @param {number} [options.outboundBearing] Outbound bearing.
 * @param {number} [options.distanceToNextRef] Distance to next Location Reference (distance defined in centimeters).
 * @returns {Feature<Point>} SharedStreets Location Reference
 * @example
 * const options = {
 *   outboundBearing: 208,
 *   distanceToNextRef: 9279
 * };
 * const locRef = sharedstreets.locationReference([-74.00482177734375, 40.741641998291016], options);
 * locRef.intersectionId // => 'NxPFkg4CrzHeFhwV7Uiq7K'
 */
export function locationReference (
  pt: number[] | Feature<Point> | Point,
  options: {
    intersectionId?: string,
    inboundBearing?: number,
    outboundBearing?: number,
    distanceToNextRef?: number,
} = {}): LocationReference {
  const coord = getCoord(pt)
  const id = options.intersectionId || intersectionId(coord)

  // Include extra properties & Reference ID to GeoJSON Properties
  const locRef: LocationReference = {intersectionId: id}
  if (options.inboundBearing) locRef.inboundBearing = options.inboundBearing
  if (options.outboundBearing) locRef.outboundBearing = options.outboundBearing
  if (options.distanceToNextRef) locRef.distanceToNextRef = options.distanceToNextRef

  if (locRef.outboundBearing !== undefined && locRef.distanceToNextRef === undefined) {
    throw new Error('distanceToNextRef is required if outboundBearing is present')
  }
  return locRef
}

/**
 * latlonsToCoords
 *
 * @param {Array<number>} latlons Single Array of paired latitude & longitudes
 * @returns {Array<Array<number>>} GeoJSON coordinate format
 * @example
 * latlonsToCoords([45, 110, 55, 120]);
 * // => [[110, 45], [120, 55]]
 */
export function latlonsToCoords (latlons: number[]) {
  const coords: Array<[number, number]> = []
  latlons.reduce((lat, deg, index) => {
    if (index % 2 === 0) return deg // Latitude
    coords.push([deg, lat])
  })
  return coords
}

/**
 * Generates Base16 Hash
 *
 * @param {string} message Message to hash
 * @returns {string} SharedStreets Reference ID
 * @example
 * sharedstreets.generateHash('Intersection -74.00482177734375 40.741641998291016');
 * // => '69f13f881649cb21ee3b359730790bb9'
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
 * sharedstreets.getRoadClass(0); // => 'Motorway'
 * sharedstreets.getRoadClass(5); // => 'Residential'
 */
export function getRoadClass (value: number) {
  switch (value) {
    case 0: return 'Motorway'
    case 1: return 'Trunk'
    case 2: return 'Primary'
    case 3: return 'Secondary'
    case 4: return 'Tertiary'
    case 5: return 'Residential'
    case 6: return 'Unclassified'
    case 7: return 'Service'
    case 8: return 'Other'
    default: throw new Error(`[${value}] unknown RoadClass value`)
  }
}

/**
 * getFormOfWay
 *
 * @param {number} value Number value [between 0-8]
 * @returns {string} Form of Way
 * @example
 * sharedstreets.getFormOfWay(0); // => 'Undefined'
 * sharedstreets.getFormOfWay(5); // => 'TrafficSquare'
 */
export function getFormOfWay (value: number) {
  switch (value) {
    case 0: return 'Undefined'
    case 1: return 'Motorway'
    case 2: return 'MultipleCarriageway'
    case 3: return 'SingleCarriageway'
    case 4: return 'Roundabout'
    case 5: return 'TrafficSquare'
    case 6: return 'SlipRoad'
    case 7: return 'Other'
    default: throw new Error(`[${value}] unknown FormOfWay value`)
  }
}
