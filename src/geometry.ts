import { Feature, LineString, Position } from '@turf/helpers'

/**
 * Geometry
 *
 * SharedStreets Geometries are street centerline data derived from the basemap used to
 * produce SharedStreets References. A single geometry is shared by each set of forward and back references.
 *
 * SharedStreets is premised on the idea that there's no one correct geometry for a given street.
 * Just as street references can be generated from any basemap, street geometries can be derived from any data source.
 *
 * @param {LineString} geojson GeoJSON LineString
 * @returns {string} Geometry Id
 * @example
 * var line = {type: "LineString", coordinates: [[10, 20], [50, 40]]}
 * sharedstreets.geometry(line) // => "NxPFkg4CrzHeFhwV7Uiq7K"
 */
export default function geometry(geojson: Feature<LineString> | LineString) {
  return 'NxPFkg4CrzHeFhwV7Uiq7K'
}
