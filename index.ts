import { Feature, Point, LineString } from '@turf/helpers'

// SharedStreets - Main
export * from './src/geometry'
export * from './src/intersection'

// Types - GeoJSON
export type SharedStreetsIntersection = Feature<Point, SharedStreetsIntersectionProps>
export type SharedStreetsGeometry = Feature<LineString, SharedStreetsGeometryProps>

// Types - GeoJSON Properties
export interface SharedStreetsIntersectionProps {
  id: string,
  osmNodeId?: number,
  inboundReferenceIds?: string[],
  outboundReferenceIds?: string[],
}

export interface SharedStreetsGeometryProps {
  id: string,
  fromIntersectionId: string,
  toIntersectionId: string,
  forwardReferenceId?: string,
  backReferenceId?: string,
  roadClass: SharedStreetsRoadClass,
}

// Types - Pbf
export interface SharedStreetsIntersectionPbf extends SharedStreetsIntersectionProps {
  lat: number
  lon: number
}

export interface SharedStreetsGeometryPbf extends SharedStreetsGeometryProps {
  latlons: number[]
}

// Types - Helpers
export type Location = Feature<Point, any> | Point | number[]
export type SharedStreetsRoadClass =
  'Motorway' |
  'Trunk' |
  'Primary' |
  'Secondary' |
  'Tertiary' |
  'Residential' |
  'Unclassified' |
  'Service' |
  'Other'

export type SharedStreetsFormOfWay =
  'Undefined' |
  'Motorway' |
  'MultipleCarriageway' |
  'SingleCarriageway' |
  'Roundabout' |
  'TrafficSquare' |
  'SlipRoad' |
  'Other'
