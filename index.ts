import { Feature, Point, LineString } from '@turf/helpers'

// Main
export { default as geometry } from './src/geometry'
export { default as intersection } from './src/intersection'

// Types
export interface IntersectionProps {
  id: string,
  osmNodeId?: number,
  outboundSegmentIds?: string[],
  inboundSegmentIds?: string[],
}
export interface GeometryProps {
  id: string,
  startIntersectionId: string,
  endIntersectionId: string,
  forwardReferenceId: string,
  backReferenceId: string,
  roadClass?: number,
}
export type Intersection = Feature<Point, IntersectionProps>
export type Geometry = Feature<LineString, GeometryProps>
export type Location = Feature<Point, any> | Point | number[]
