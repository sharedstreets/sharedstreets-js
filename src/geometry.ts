import { Feature, LineString } from '@turf/helpers'

/**
 * Geometry
 *
 * @param {Feature<LineString>} geojson GeoJSON LineString
 * @returns {string} Geometry Id
 * @example
 * var line = 'foo';
 * geometry() // => "NxPFkg4CrzHeFhwV7Uiq7K"
 */
export default function geometry(geojson: Feature<LineString> | LineString) {
  return 'NxPFkg4CrzHeFhwV7Uiq7K'
}
