import { Point, Feature } from '@turf/helpers'
import {
  SharedStreetsIntersectionProperties,
  SharedStreetsGeometryProperties,
  SharedStreetsRoadClass,
  SharedStreetsFormOfWay,
} from 'sharedstreets-types'

export function getRoadClass(value: number): SharedStreetsRoadClass {
  switch (value) {
    case 0: { return 'Motorway' }
    case 1: { return 'Trunk' }
    case 2: { return 'Primary' }
    case 3: { return 'Secondary' }
    case 4: { return 'Tertiary' }
    case 5: { return 'Residential' }
    case 6: { return 'Unclassified' }
    case 7: { return 'Service' }
    case 8: { return 'Other' }
    default: throw new Error(`[${value}] unknown RoadClass value`)
  }
}

export function getFormOfWay(value: number): SharedStreetsFormOfWay {
  switch (value) {
    case 0: { return 'Undefined' }
    case 1: { return 'Motorway' }
    case 2: { return 'MultipleCarriageway' }
    case 3: { return 'SingleCarriageway' }
    case 4: { return 'Roundabout' }
    case 5: { return 'TrafficSquare' }
    case 6: { return 'SlipRoad' }
    case 7: { return 'Other' }
    default: throw new Error(`[${value}] unknown FormOfWay value`)
  }
}

// SharedStreets - Pbf
export interface SharedStreetsIntersectionPbf extends SharedStreetsIntersectionProperties {
  lat: number
  lon: number
}

export interface SharedStreetsGeometryPbf extends SharedStreetsGeometryProperties {
  latlons: number[]
}

// SharedStreets - Helpers
export type Location = Feature<Point, any> | Point | number[]
