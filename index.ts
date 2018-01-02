import { Feature, Point, LineString } from '@turf/helpers'

/**
 * SharedStreets - Main
 */
export * from './src/geometry'
export * from './src/intersection'

/**
 * Types - GeoJSON
 */
export type SharedStreetsIntersection = Feature<Point, SharedStreetsIntersectionProps>
export type SharedStreetsGeometry = Feature<LineString, SharedStreetsGeometryProps>

/**
 * Types - GeoJSON Properties
 */
export interface SharedStreetsIntersectionProps {
  id: string,
  osmNodeId?: number,
  outboundSegmentIds?: string[],
  inboundSegmentIds?: string[],
}

export interface SharedStreetsGeometryProps {
  id: string,
  startIntersectionId: string,
  endIntersectionId: string,
  forwardReferenceId: string,
  backReferenceId: string,
  roadClass?: number,
}

/**
 * Types - Pbf
 */
export interface SharedStreetsIntersectionPbf {
  id: string
  osmNodeId: number
  lat: number
  lon: number
  inboundReferenceIds: string[]
  outboundReferenceIds: string[]
}

/**
 * Types - Helpers
 */
export type Location = Feature<Point, any> | Point | number[]
