import { lineString } from '@turf/helpers'
import { getCoord } from '@turf/invariant'
import { Geometry, Location } from '../'

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
 * @returns {Feature<LineString>} Geometry
 * @example
 * var start = [-74.003388, 40.634538];
 * var end = [-74.004107, 40.63406];
 * var bearing = 228.890377;
 *
 * var geom = sharedstreets.geometry(start, end, bearing);
 * geom.id // => 'NxPFkg4CrzHeFhwV7Uiq7K'
 */
export default function geometry(start: Location, end: Location, bearing: number): Geometry {
  const id = 'NxPFkg4CrzHeFhwV7Uiq7K'
  const coords = [getCoord(start), getCoord(end)]
  const properties = {
    id,
    startIntersectionId: '5gRJyF2MT5BBErTyEesQLC',
    endIntersectionId: 'N38a21UGykpnqxwez7NGS3',
    forwardReferenceId: '2Vw2XzW4cs7r32RLhQnqwA',
    backReferenceId: 'VXKSEokmvBJ81XHYhUronG',
    roadClass: 3,
  }
  return lineString(coords, properties, {id})
}
