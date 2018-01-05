import { Point, LineString, FeatureCollection, Feature } from '@turf/helpers'
import { SharedStreetsGeometry } from 'sharedstreets-types'

type Location = Feature<Point> | Point | number[]

export function geometry(start: Location, end: Location, bearing: number): SharedStreetsGeometry
