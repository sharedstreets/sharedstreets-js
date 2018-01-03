import Pbf from '../lib/pbf'
import { lineString, featureCollection, LineString, FeatureCollection } from '@turf/helpers'
import { getCoord } from '@turf/invariant'
import { getRoadClass } from './helpers'
import {
  SharedStreetsGeometry as Geometry,
  SharedStreetsGeometryPbf as Proto,
  SharedStreetsGeometryProps as Props,
  Location,
} from '../'

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
 * var start = [-74.003388, 40.634538];
 * var end = [-74.004107, 40.63406];
 * var bearing = 228.890377;
 *
 * var geom = sharedstreets.geometry(start, end, bearing);
 * geom.id // => 'NxPFkg4CrzHeFhwV7Uiq7K'
 */
export function geometry(start: Location, end: Location, bearing: number): Geometry {
  const id = 'NxPFkg4CrzHeFhwV7Uiq7K'
  const coords = [getCoord(start), getCoord(end)]
  const properties = {
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
 * Geometry Pbf
 *
 * Parser for SharedStreets Geometry Pbf Buffers
 *
 * @param {Buffer} buffer Pbf Buffer
 * @returns {FeatureCollection<LineString>} FeatureCollection of SharedStreets Geometries
 * @example
 * var buffer = fs.readFileSync('z-x-y.geometry.pbf')
 *
 * var collection = sharedstreets.geometryPbf(buffer);
 * collection.features[0].id // => 'NxPFkg4CrzHeFhwV7Uiq7K'
 */
export function geometryPbf(buffer: Buffer | Uint8Array): FeatureCollection<LineString, Props> {
  const results: Geometry[] = []

  new Pbf(buffer).readFields<Proto>((tag, data, pbf) => {
    switch (tag) {
      case 1:
        data.id = pbf.readString()
        break
      case 2:
        data.fromIntersectionId = pbf.readString()
        break
      case 3:
        data.toIntersectionId = pbf.readString()
        break
      case 4:
        data.forwardReferenceId = pbf.readString()
        break
      case 5:
        data.backReferenceId = pbf.readString()
        break
      case 6:
        data.roadClass = getRoadClass(pbf.readVarint())
        break
      case 7:
        data.latlons = pbf.readPackedFloat()
        break
      default:
        if (data.id) {
          // Save SharedStreets Intersection GeoJSON Point
          const id = data.id
          const coords = latlonsToCoords(data.latlons)
          const properties = {
            id: data.id,
            fromIntersectionId: data.fromIntersectionId,
            toIntersectionId: data.toIntersectionId,
            forwardReferenceId: data.forwardReferenceId,
            backReferenceId: data.backReferenceId,
            roadClass: data.roadClass,
          }
          // console.log(data.latlons)
          results.push(lineString(coords, properties, {id}))
        }
        // Reset Data
        data.id = null
        data.fromIntersectionId = null
        data.toIntersectionId = null
        data.forwardReferenceId = null
        data.backReferenceId = null
        data.roadClass = null
        data.latlons = []
        return data
    }
  }, {
    id: null,
    fromIntersectionId: null,
    toIntersectionId: null,
    forwardReferenceId: null,
    backReferenceId: null,
    roadClass: null,
    latlons: [],
  })

  return featureCollection(results)
}

export function latlonsToCoords(latlons: number[]) {
  const coords: Array<[number, number]> = []
  latlons.reduce((lat, deg, index) => {
    if (index % 2 === 0) return deg // Latitude
    coords.push([deg, lat])
  })
  return coords
}
