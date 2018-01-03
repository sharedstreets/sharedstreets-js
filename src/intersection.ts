import * as fs from 'fs'
import { getCoord } from '@turf/invariant'
import Pbf from '../lib/pbf'
import { point, featureCollection, Feature, Point, Position, FeatureCollection } from '@turf/helpers'
import {
  SharedStreetsIntersection as Intersection,
  SharedStreetsIntersectionPbf as Proto,
  SharedStreetsIntersectionProps as Props,
  Location,
} from '../'

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
 * @param {Point|Array<number>} pt Point location reference as a GeoJSON Point or an Array of numbers <longitude, latitude>.
 * @returns {Feature<Point>} Intersection
 * @example
 * var pt = [10, 20];
 * var intersection = sharedstreets.intersection(pt);
 * intersection.id // => '5gRJyF2MT5BBErTyEesQLC'
 */
export function intersection(pt: Location): Intersection {
  const coord = getCoord(pt)
  const id = '5gRJyF2MT5BBErTyEesQLC'
  const properties = {
    id,
    osmNodeId: 42460951,
    outboundSegmentIds: ['6mjqqv7YNsp4541DmrrRbV', 'jwwKcUvHuCw6GJJAT3mDQ', '2Vw2XzW4cs7r32RLhQnqwA'],
    inboundSegmentIds: ['VmSkhzGKoEc767w98x35La', 'VXKSEokmvBJ81XHYhUronG', 'B7RPzs3hb1cSXqYcAKmUhE'],
  }

  return point(coord, properties, {id})
}

/**
 * Intersection Pbf
 *
 * Parser for SharedStreets Intersection Pbf Buffers
 *
 * @param {Buffer} buffer Pbf Buffer
 * @returns {FeatureCollection<Point>} FeatureCollection of SharedStreets Intersections
 * @example
 * var buffer = fs.readFileSync('z-x-y.intersection.pbf')
 *
 * var collection = sharedstreets.intersectionPbf(buffer);
 * collection.features[0].id // => 'NxPFkg4CrzHeFhwV7Uiq7K'
 */
export function intersectionPbf(buffer: Buffer | Uint8Array): FeatureCollection<Point, Props> {
  const results: Intersection[] = []

  new Pbf(buffer).readFields<Proto>((tag, data, pbf) => {
    switch (tag) {
      case 1:
        data.id = pbf.readString()
        break
      case 2:
        data.osmNodeId = pbf.readVarint64()
        break
      case 3:
        data.lat = pbf.readFloat()
        break
      case 4:
        data.lon = pbf.readFloat()
        break
      case 5:
        data.inboundReferenceIds.push(pbf.readString())
        break
      case 6:
        data.outboundReferenceIds.push(pbf.readString())
        break
      default:
        if (data.id) {
          // Save SharedStreets Intersection GeoJSON Point
          const id = data.id
          const coord = [data.lon, data.lat]
          const properties = {
            id: data.id,
            osmNodeId: data.osmNodeId,
            inboundReferenceIds: data.inboundReferenceIds,
            outboundReferenceIds: data.outboundReferenceIds,
          }
          results.push(point(coord, properties, {id}))
        }
        // Reset Data
        data.id = null
        data.osmNodeId = null
        data.lat = null
        data.lon = null
        data.inboundReferenceIds = []
        data.outboundReferenceIds = []
        return data
    }
  }, {
    id: null,
    osmNodeId: null,
    lat: null,
    lon: null,
    inboundReferenceIds: [],
    outboundReferenceIds: [],
  })

  return featureCollection(results)
}
