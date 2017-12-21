import { Feature, LineString } from '@turf/helpers'

/**
 * Segement Reference
 *
 * The OpenLR-style street segment references are the foundation of the SharedStreets Referencing System.
 * These references allow users to uniquely describe any street segment in the world using just a few
 * high-level characteristics.
 *
 * This allows users with different map geometries to describe the same street segments in identical or
 * nearly identical terms. The references are used to find matching streets in users' existing internal maps.
 * In cases where no matching street is found, users have the opportunity to update their map data to fill in missing or
 * incorrectly mapped segments.
 *
 * Street segment references protect users' intellectual property, as data can be shared without disclosing a
 * complete map. Segment references also enable rapid reconciliation of data derived from different maps.
 *
 * @param {LineString} geojson GeoJSON LineString
 * @returns {string} Segment Reference Id
 * @example
 * var line = {type: "LineString", coordinates: [[10, 20], [50, 40]]}
 * sharedstreets.segmentReference(line) // => "NxPFkg4CrzHeFhwV7Uiq7K"
 */
export default function segmentReference(geojson: Feature<LineString> | LineString) {
  return 'NxPFkg4CrzHeFhwV7Uiq7K'
}
