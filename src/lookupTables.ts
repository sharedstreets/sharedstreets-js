import { Feature, Point, LineString } from '@turf/helpers'

export const roadClass = {
  Motorway: 0,
  Trunk: 1,
  Primary: 2,
  Secondary: 3,
  Tertiary: 4,
  Residential: 5,
  Unclassified: 6,
  Service: 7,
  Other: 8,
}

export const formOfWay = {
  Undefined: 0,
  Motorway: 1,
  MultipleCarriageway: 2,
  SingleCarriageway: 3,
  Roundabout: 4,
  TrafficSquare: 5,
  SlipRoad: 6,
  Other: 7,
}
