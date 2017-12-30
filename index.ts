import { Feature, Point, LineString } from '@turf/helpers'

// Main
export { default as geometry } from './src/geometry'
export { default as intersection } from './src/intersection'

// Types
export type Intersection = Feature<Point, {
  id: string,
  osmNodeId?: number,
  outboundSegmentIds?: string[],
  inboundSegmentIds?: string[],
}>

export type Geometry = Feature<LineString, {
  id: string,
  startIntersectionId: string,
  endIntersectionId: string,
  forwardReferenceId: string,
  backReferenceId: string,
  roadClass?: number,
}>
