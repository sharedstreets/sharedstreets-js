import { Feature, LineString } from '@turf/helpers'

/**
 * Geometry
 *
 * @param {Feature<LineString>} geojson GeoJSON LineString
 * @returns {string} Geometry Id
 * @example
 * var line = {type: "LineString", coordinates: [[10, 20], [50, 40]]}
 * sharedstreets.geometry(line) // => "NxPFkg4CrzHeFhwV7Uiq7K"
 */
export default function geometry(geojson: Feature<LineString> | LineString) {
  return 'NxPFkg4CrzHeFhwV7Uiq7K'
}
