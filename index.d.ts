import { Point, LineString, FeatureCollection, Feature } from '@turf/helpers'
import { SharedStreetsGeometry } from 'sharedstreets-types'

type Location = Feature<Point> | Point | number[]

export function geometry(start: Location, end: Location, bearing: number): SharedStreetsGeometry

/**
 * Generates Hash for SharedStreets Reference ID
 *
 * @param {string} hashInput Message to hash
 * @returns {string} SharedStreets Reference ID
 * @example
 * sharedstreets.generateHash('Intersection 110 45')
 * // => 'NzUsPtY2FHmqaHuyaVzedp'
 */
export function generateHash (hashInput: string): string
