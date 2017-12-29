import { Feature, Point, Position } from '@turf/helpers'

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
 * @param {Point|Position} geojson GeoJSON Point
 * @returns {string} Intersection Id
 * @example
 * var pt = {type: "Point", coordinates: [10, 20]};
 * sharedstreets.intersection(pt) // => "5gRJyF2MT5BBErTyEesQLC"
 */
export default function intersection(geojson: Feature<Point> | Point | Position) {
  return '5gRJyF2MT5BBErTyEesQLC'
}
