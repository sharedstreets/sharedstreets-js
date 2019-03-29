'use strict';

import * as turfHelpers from '@turf/helpers';

import lineSliceAlong from '@turf/line-slice-along';
import along from '@turf/along';
import bearing from '@turf/bearing';
import distance from '@turf/distance';
import length from '@turf/length';
import nearestPointOnLine from '@turf/nearest-point-on-line';

import { rmse } from './util';

import { reverseLineString } from './geom';
import { TileIndex } from './tile_index';
import { TilePathParams, TileType } from './tiles';
import { Feature, LineString } from '@turf/buffer/node_modules/@turf/helpers';
import { RoadClass, SharedStreetsReference } from 'sharedstreets-types';
import { SharedStreetsGeometry } from 'sharedstreets-pbf/proto/sharedstreets';
import { forwardReference, backReference } from './index';

// import { start } from 'repl';
// import { normalize } from 'path';


const DEFAULT_SEARCH_RADIUS = 25;
const DEFAULT_LENGTH_TOLERANCE = 0.1;
const DEFUALT_CANDIDATES = 2;
const DEFAULT_BEARING_TOLERANCE  = 15; // 360 +/- tolerance

const MAX_FEATURE_LENGTH = 15000; // 1km

const MAX_SEARCH_RADIUS = 100;
const MAX_LENGTH_TOLERANCE = 0.5;
const MAX_CANDIDATES = 10;
const MAX_BEARING_TOLERANCE  = 180; // 360 +/- tolerance

const REFERNECE_GEOMETRY_OFFSET = 2;
const MAX_ROUTE_QUERIES = 16;

// TODO need to pull this from PBF enum defintion 

// @property {number} Motorway=0 Motorway value
//  * @property {number} Trunk=1 Trunk value
//  * @property {number} Primary=2 Primary value
//  * @property {number} Secondary=3 Secondary value
//  * @property {number} Tertiary=4 Tertiary value
//  * @property {number} Residential=5 Residential value
//  * @property {number} Unclassified=6 Unclassified value
//  * @property {number} Service=7 Service value
//  * @property {number} Other=8 Other value

function roadClassConverter(roadClass:string):number {

	if(roadClass === 'Motorway')
		return 0;
	else if(roadClass === 'Trunk')
		return 1;
	else if(roadClass === 'Primary')
		return 2;
	else if(roadClass === 'Secondary')
		return 3;
	else if(roadClass === 'Tertiary')
		return 4;
	else if(roadClass === 'Residential')
		return 5;
	else if(roadClass === 'Unclassified')
		return 6;
	else if(roadClass === 'Service')
		return 7;
	else 
		return null;
}

function angleDelta(a1, a2) {

	var delta = 180 - Math.abs(Math.abs(a1 - a2) - 180); 
	return delta;

}

function normalizeAngle(a) {

	if(a < 0) 
		return a + 360;
	return a;

}

export enum ReferenceDirection {

	FORWARD = "forward",
	BACKWARD = "backward"

}

export enum ReferenceSideOfStreet {

	RIGHT = "right",
	LEFT = "left",
	UNKNOWN = "unknown"

}

interface SortableCanddate {

	score:number;
	calcScore():number;

}

class PointCandidate implements SortableCanddate {

	score:number;
	
	searchPoint:turfHelpers.Feature<turfHelpers.Point>;
	pointOnLine:turfHelpers.Feature<turfHelpers.Point>;
	snappedPoint:turfHelpers.Feature<turfHelpers.Point>;

	geometryId:string;
	referenceId:string;
	roadClass:RoadClass;
	direction:ReferenceDirection;
	streetname:string;
	referenceLength:number;
	location:number;
	bearing:number;
	interceptAngle:number;
	sideOfStreet:ReferenceSideOfStreet;
	oneway:boolean;

	calcScore():number {
		
		if(!this.score) {

			// score for snapped points are average of distance to point on line distance and distance to snapped ponit
			if(this.snappedPoint)
				this.score = (this.pointOnLine.properties.dist + distance(this.searchPoint, this.snappedPoint, {units: 'meters'})) / 2;
			else
				this.score = this.pointOnLine.properties.dist;
				
		}
		return this.score;

	}

	toFeature():turfHelpers.Feature<turfHelpers.Point> {

		this.calcScore();

		var snappedSide = ReferenceSideOfStreet.UNKNOWN;
		if(this.interceptAngle < 180) {
			snappedSide = ReferenceSideOfStreet.RIGHT;
		}
		if(this.interceptAngle > 180) {
			snappedSide = ReferenceSideOfStreet.LEFT;
		}

		var feature:turfHelpers.Feature<turfHelpers.Point> = turfHelpers.feature(this.pointOnLine.geometry, {	

			score:			this.score,
			location: 		this.location,
			referenceLength: this.referenceLength,
			geometryId:		this.geometryId,
			referenceId:	this.referenceId,
			direction:		this.direction,
			bearing:		this.bearing,
			snappedSide: 	snappedSide,
			interceptAngle:	this.interceptAngle

		});

		return feature;

	}
}

export class PathSegment {

	referenceId:string;
	geometryId:string;
	roadClass:RoadClass;
	streetname:string;

	fromIntersectionId:string;
	toIntersectionId:string;

	fromStreetnames:string[];
	toStreetnames:string[];

	referenceLength:number;
	point:number;
	section:number[];
	direction:ReferenceDirection;
}

export class PathCandidate implements SortableCanddate {

	score:number;
	originalFeatureLength:number;
	pathLength:number;

	startPoint:PointCandidate;
	endPoint:PointCandidate;

	segments:PathSegment[];

	originalFeature:turfHelpers.Feature<turfHelpers.LineString>;
	matchedPath:turfHelpers.Feature<turfHelpers.LineString>;

	sideOfStreet:ReferenceSideOfStreet;

	getOriginalFeatureLength() {

		if(!this.originalFeatureLength) 
			this.originalFeatureLength = length(this.originalFeature, {"units":"meters"});

		return this.originalFeatureLength;

	}

	getPathLength():number {

		if(!this.pathLength) {
			this.pathLength = 0;
			for(var segment of this.segments) {
				if(segment.section)
					this.pathLength = this.pathLength + (segment.section[1] - segment.section[0]);
				else 
					this.pathLength = this.pathLength + segment.referenceLength;
			}
		}

		return this.pathLength;

	}

	getLengthDelta():number {
		return this.getPathLength() - this.getOriginalFeatureLength();
	}

	calcScore():number {

		if(!this.score) {
			this.score  = rmse([this.startPoint.score, this.endPoint.score, this.getLengthDelta()]) + (this.segments.length / 10);
		}
		return this.score;

	}

	isMatched():boolean {
		if(this.segments && this.segments.length > 0)
			return true;
		else 
			return false;
	}

	isColinear(candidate:PathCandidate):boolean {

		if(this.segments.length > 0 && candidate.segments.length > 0 && this.segments.length == candidate.segments.length) {

			var path1GeometryIds:Set<string> = new Set();
			var path2GeometryIds:Set<string> = new Set();

			for(var segment of this.segments) {
				path1GeometryIds.add(segment.geometryId);				
			}

			for(var segment of candidate.segments) {
				path2GeometryIds.add(segment.geometryId);

				if(!path1GeometryIds.has(segment.geometryId))
					return false;				
			}

			for(var segment of this.segments) {
				if(!path2GeometryIds.has(segment.geometryId))
					return false;					
			}

		}
		else 
			return false; 

		return true;

	}

	isParallel(candidate:PathCandidate, bearingTolerance:number):boolean {

		if(this.segments.length > 0 && candidate.segments.length > 0) {

			var path1Bearing = normalizeAngle(bearing(this.startPoint.pointOnLine, this.endPoint.pointOnLine));
			var path2Bearing = normalizeAngle(bearing(candidate.endPoint.pointOnLine, candidate.startPoint.pointOnLine));

			if(angleDelta(path1Bearing, path2Bearing) < bearingTolerance)
				return true;

		}
		
		return false; 

	}
}

export class Matcher {

    tileIndex:TileIndex;

	searchRadius:number = DEFAULT_SEARCH_RADIUS;
	bearingTolerance:number = DEFAULT_BEARING_TOLERANCE;
	lengthTolerance:number = DEFAULT_LENGTH_TOLERANCE;

	includeIntersections:boolean = false;
	includeStreetnames:boolean = false;
	ignoreDirection:boolean = false;
	snapToIntersections:boolean = false;
	snapTopology:boolean = false;
	snapSideOfStreet:ReferenceSideOfStreet = ReferenceSideOfStreet.UNKNOWN;

	tileParams:TilePathParams;

    constructor(params:TilePathParams) {
        this.tileParams = params;
        this.tileIndex = new TileIndex();
    }

	directionForRefId(refId:string):ReferenceDirection {

		var ref = <SharedStreetsReference>this.tileIndex.objectIndex.get(refId);

		if(ref) {
			var geom:SharedStreetsGeometry = <SharedStreetsGeometry>this.tileIndex.objectIndex.get(ref['geometryId']);

			if(geom) {
				if(geom['forwardReferenceId'] === ref['id'])
					return ReferenceDirection.FORWARD
				else if(geom['backReferenceId'] === ref['id'])
					return ReferenceDirection.BACKWARD
			}
		}
		return null;
	}

	toIntersectionIdForRefId(refId:string):string {
		var ref:SharedStreetsReference = <SharedStreetsReference>this.tileIndex.objectIndex.get(refId);
		return ref.locationReferences[ref.locationReferences.length - 1].intersectionId;								
	}

	fromIntersectionIdForRefId(refId:string):string {
		var ref:SharedStreetsReference = <SharedStreetsReference>this.tileIndex.objectIndex.get(refId);
		return ref.locationReferences[0].intersectionId;
	}


	async getPointCandidateFromGeom(searchPoint:turfHelpers.Feature<turfHelpers.Point>, pointOnLine:turfHelpers.Feature<turfHelpers.Point>, candidateGeom:SharedStreetsGeometry, candidateGeomFeature:Feature<LineString>,  searchBearing:number, direction:ReferenceDirection):Promise<PointCandidate> {

		if(pointOnLine.properties.dist < this.searchRadius) {

			var reference:SharedStreetsReference;

			if(direction === ReferenceDirection.FORWARD) {
				reference = <SharedStreetsReference>this.tileIndex.objectIndex.get(candidateGeom.forwardReferenceId);
			}
			else {

				if(candidateGeom.backReferenceId) 
					reference = <SharedStreetsReference>this.tileIndex.objectIndex.get(candidateGeom.backReferenceId);
				else
					return null; // no back-reference

			}
				
			var refLength = 0;
			for(var lr of reference.locationReferences) {
				if(lr.distanceToNextRef)
					refLength = refLength + (lr.distanceToNextRef / 100);
			}

			var interceptBearing = normalizeAngle(bearing(pointOnLine, searchPoint));

			var i = pointOnLine.properties.index;

			if(candidateGeomFeature.geometry.coordinates.length <= i + 1)
				i = i - 1;

			var lineBearing = bearing(candidateGeomFeature.geometry.coordinates[i], candidateGeomFeature.geometry.coordinates[i + 1]);

			if(direction === ReferenceDirection.BACKWARD)
				lineBearing += 180;

			lineBearing = normalizeAngle(lineBearing);	
			
			var pointCandidate:PointCandidate = new PointCandidate();

			pointCandidate.searchPoint = searchPoint;
			pointCandidate.pointOnLine = pointOnLine;


			pointCandidate.geometryId = candidateGeomFeature.properties.id; 
			pointCandidate.referenceId = reference.id;
			pointCandidate.roadClass = candidateGeom.roadClass;

			// if(this.includeStreetnames) {
			// 	var metadata = await this.cache.metadataById(pointCandidate.geometryId);
			// 	pointCandidate.streetname = metadata.name;
			// }

			pointCandidate.direction = direction;
			pointCandidate.referenceLength = refLength;

			if(direction === ReferenceDirection.FORWARD) 
				pointCandidate.location = pointOnLine.properties.location;
			else
				pointCandidate.location = refLength - pointOnLine.properties.location;

			pointCandidate.bearing = normalizeAngle(lineBearing);
			pointCandidate.interceptAngle = normalizeAngle(interceptBearing - lineBearing);

			if(candidateGeom.backReferenceId)
				pointCandidate.oneway = false;
			else
				pointCandidate.oneway = true;
			
			// check bearing and add to candidate list
			if(searchBearing == null || angleDelta(searchBearing, lineBearing) < this.bearingTolerance)
				return pointCandidate;
		}

		return null;
	}

	async getPointCandidates(searchPoint:turfHelpers.Feature<turfHelpers.Point>, searchBearing:number, maxCandidates:number):Promise<PointCandidate[]> {

		var candidateFeatures = await this.tileIndex.nearby(searchPoint, TileType.GEOMETRY, this.searchRadius, this.tileParams, [TileType.REFERENCE]);

		var candidates:PointCandidate[] = new Array();

		if(candidateFeatures && candidateFeatures.features) {

			for(var candidateFeature of candidateFeatures.features) {

				var candidateGeom:SharedStreetsGeometry = <SharedStreetsGeometry>this.tileIndex.objectIndex.get(candidateFeature.properties.id);
				var candidateGeomFeature:turfHelpers.Feature<turfHelpers.LineString> = <turfHelpers.Feature<turfHelpers.LineString>>this.tileIndex.featureIndex.get(candidateFeature.properties.id);
				var pointOnLine = nearestPointOnLine(candidateGeomFeature, searchPoint, {units:'meters'});	
				
				var forwardCandidate = await this.getPointCandidateFromGeom(searchPoint, pointOnLine, candidateGeom, candidateGeomFeature, searchBearing, ReferenceDirection.FORWARD);
				var backwardCandidate = await this.getPointCandidateFromGeom(searchPoint, pointOnLine, candidateGeom, candidateGeomFeature, searchBearing, ReferenceDirection.BACKWARD);
				
				if(forwardCandidate != null) {

					var snapped = false; 

					if(this.snapToIntersections) {
						if(forwardCandidate.location < this.searchRadius) {

							var snappedForwardCandidate1 = Object.assign(new PointCandidate, forwardCandidate);
							snappedForwardCandidate1.location = 0;

							snappedForwardCandidate1.snappedPoint = along(candidateGeomFeature, 0, {"units":"meters"});

							candidates.push(snappedForwardCandidate1);
							snapped = true;

						}
						
						if(forwardCandidate.referenceLength - forwardCandidate.location < this.searchRadius) {

							var snappedForwardCandidate2 = Object.assign(new PointCandidate, forwardCandidate);
							snappedForwardCandidate2.location = snappedForwardCandidate2.referenceLength;

							snappedForwardCandidate2.snappedPoint = along(candidateGeomFeature, snappedForwardCandidate2.referenceLength, {"units":"meters"});

							candidates.push(snappedForwardCandidate2);
							snapped = true;

						}
					}

					if(!snapped)  {
						candidates.push(forwardCandidate);
					}
				}

				if(backwardCandidate != null) {

					var snapped = false; 

					if(this.snapToIntersections) {

						if(backwardCandidate.location < this.searchRadius) {

							var snappedBackwardCandidate1:PointCandidate = Object.assign(new PointCandidate, backwardCandidate);
							snappedBackwardCandidate1.location = 0;

							// not reversing the geom so snap to end on backRefs
							snappedBackwardCandidate1.snappedPoint = along(candidateGeomFeature, snappedBackwardCandidate1.referenceLength, {"units":"meters"});

							candidates.push(snappedBackwardCandidate1);
							snapped = true;

						}
						
						if(backwardCandidate.referenceLength - backwardCandidate.location < this.searchRadius) {

							var snappedBackwardCandidate2 = Object.assign(new PointCandidate, backwardCandidate);
							snappedBackwardCandidate2.location = snappedBackwardCandidate2.referenceLength;

							// not reversing the geom so snap to start on backRefs
							snappedBackwardCandidate2.snappedPoint = along(candidateGeomFeature, 0, {"units":"meters"});

							candidates.push(snappedBackwardCandidate2);
							snapped = true;

						}
					}

					if(!snapped)  {
						candidates.push(backwardCandidate);
					}
				}
			}
		}

		var sortedCandidates = candidates.sort((p1, p2) => {
			p1.calcScore();
			p2.calcScore();
			if(p1.score > p2.score) {
				return 1;
			}
			if(p1.score < p2.score) {
				return -1;
			}
			return 0;
		});
		
		if(sortedCandidates.length > maxCandidates) {
			sortedCandidates = sortedCandidates.slice(0, maxCandidates);
		}
	
		return sortedCandidates;

	}

	async getPathCandidatesForRef(featureRef:SharedStreetsReference, originalFeature:turfHelpers.Feature<turfHelpers.LineString>, formOfWay):Promise<PathCandidate[]> {

		var refLength = 0;
		for(var refLr of featureRef.locationReferences) {
			if(refLr.distanceToNextRef)
				refLength = refLength + (refLr.distanceToNextRef / 100);
		}
		
		var searchBearing1 = featureRef.locationReferences[0].outboundBearing;
		var searchBearing2 = featureRef.locationReferences[featureRef.locationReferences.length - 1].inboundBearing;
	
		var startPoint:turfHelpers.Feature<turfHelpers.Point> = turfHelpers.point([featureRef.locationReferences[0].lon, featureRef.locationReferences[0].lat]);
		var endPoint:turfHelpers.Feature<turfHelpers.Point> = turfHelpers.point([featureRef.locationReferences[featureRef.locationReferences.length - 1].lon, featureRef.locationReferences[featureRef.locationReferences.length - 1].lat]);

		var candidates1 = await this.getPointCandidates(startPoint, searchBearing1, MAX_CANDIDATES);
		var candidates2 = await this.getPointCandidates(endPoint, searchBearing2, MAX_CANDIDATES);
	
		var candidates:any[] = new Array();
	
		var routeCount = 0;
	
		for(var c1 of candidates1) {
			for(var c2 of candidates2) {
	
				var matchFormOfWay = true;
	
				var snappedSide:ReferenceSideOfStreet = ReferenceSideOfStreet.UNKNOWN;
	
				if(this.snapSideOfStreet) {
					if(c1.interceptAngle < 180 && c2.interceptAngle < 180) {
						if(this.snapSideOfStreet == ReferenceSideOfStreet.RIGHT || c1.oneway) {
							snappedSide = ReferenceSideOfStreet.RIGHT;
						}
					}
					if(c1.interceptAngle > 180 && c2.interceptAngle > 180) {
						if(this.snapSideOfStreet == ReferenceSideOfStreet.LEFT || c1.oneway) {
							snappedSide = ReferenceSideOfStreet.LEFT;
						}
					}
				}
	
				var pathCandidate:PathCandidate = new PathCandidate();	

				pathCandidate.startPoint = c1;
				pathCandidate.endPoint = c2;
				pathCandidate.sideOfStreet = snappedSide;
				pathCandidate.originalFeature = originalFeature;

				// co-linear potins along the same reference -- so simple!
				if(c1.geometryId === c2.geometryId) {
	
					var segmentRef:SharedStreetsReference = <SharedStreetsReference>this.tileIndex.objectIndex.get(c1.referenceId);	
	
					var segmentLength = 0;
					for(var lr of segmentRef.locationReferences) {
						if(lr.distanceToNextRef)
							segmentLength = segmentLength + (lr.distanceToNextRef / 100);
					}
				
					if(formOfWay != null) {
						if(!formOfWay.includes(segmentRef.formOfWay))
							matchFormOfWay = false;
					}

					if(matchFormOfWay) {

						pathCandidate.pathLength = pathLength;

						var pathSegment:PathSegment = new PathSegment();
						pathSegment.referenceId = c1.referenceId;
						
						pathSegment.fromIntersectionId = this.fromIntersectionIdForRefId(c1.referenceId); 
						pathSegment.toIntersectionId = this.toIntersectionIdForRefId(c1.referenceId);

						// if(this.includeStreetnames) {
						// 	pathSegment.fromStreetnames = await this.streetnamesForIntersectionId(pathSegment.fromIntersectionId, pathSegment.referenceId);	
						// 	pathSegment.toStreetnames = await this.streetnamesForIntersectionId(pathSegment.toIntersectionId, pathSegment.referenceId);	
						// }

						pathSegment.roadClass = c1.roadClass;
						pathSegment.direction = this.directionForRefId(c1.referenceId);
						pathSegment.geometryId = c1.geometryId;

						// if(this.includeStreetnames) {
						// 	var metadata = await this.cache.metadataById(pathSegment.geometryId);
						// 	pathSegment.streetname = metadata.name;
						// }

						pathSegment.referenceLength = segmentLength;
						
						pathSegment.section = [c1.location,c2.location];

						pathCandidate.segments = [pathSegment];

						if(c1.location != c2.location)
							candidates.push(pathCandidate);

					}			
				}
				else {
					
					if(routeCount < MAX_ROUTE_QUERIES) {

						var startRef:SharedStreetsReference = <SharedStreetsReference>this.tileIndex.objectIndex.get(c1.referenceId);
						var endRef:SharedStreetsReference = <SharedStreetsReference>this.tileIndex.objectIndex.get(c2.referenceId);
	
						var startIntersectionId = startRef.locationReferences[0].intersectionId;
						var endIntersectionId = endRef.locationReferences[startRef.locationReferences.length - 1].intersectionId;
	

						var route = await this.tileIndex.route(startRef, c1.location, endRef, c2.location, c2.toFeature().geometry.coordinates, pathCandidate.getOriginalFeatureLength(), this.lengthTolerance);
						
						if(route.length == 0)
							continue

						var pathLength = 0;
						var segments:PathSegment[] = []
	
						for(var referenceId of route) {
	
							var segmentRef:SharedStreetsReference = <SharedStreetsReference>this.tileIndex.objectIndex.get(referenceId);
							var segementGeom:SharedStreetsGeometry = <SharedStreetsGeometry>this.tileIndex.objectIndex.get(segmentRef.geometryId);
							var segmentLength = 0;
							for(var lr of segmentRef.locationReferences) {
								if(lr.distanceToNextRef)
									segmentLength = segmentLength + (lr.distanceToNextRef / 100);
							}
	
							if(formOfWay != null) {
								if(!formOfWay.includes(segmentRef.formOfWay))
									matchFormOfWay = false;
							}
							
							if(referenceId == c1.referenceId) {

								var pathSegment:PathSegment = new PathSegment();
								pathSegment.referenceId = referenceId;

								pathSegment.fromIntersectionId = this.fromIntersectionIdForRefId(referenceId); 
								pathSegment.toIntersectionId = this.toIntersectionIdForRefId(referenceId);

								// if(this.includeStreetnames) {
								// 	pathSegment.fromStreetnames = await this.streetnamesForIntersectionId(pathSegment.fromIntersectionId, pathSegment.referenceId);	
								// 	pathSegment.toStreetnames = await this.streetnamesForIntersectionId(pathSegment.toIntersectionId, pathSegment.referenceId);	
								// }

								pathSegment.roadClass = segementGeom.roadClass;
								pathSegment.direction = this.directionForRefId(referenceId);
								pathSegment.geometryId = segmentRef.geometryId;
								
								// if(this.includeStreetnames) {
								// 	var metadata = await this.cache.metadataById(pathSegment.geometryId);
								// 	pathSegment.streetname = metadata.name;
								// }
								
								pathSegment.referenceLength = segmentLength;

								pathSegment.section = [c1.location, segmentLength];
								
								if(c1.location != segmentLength)
									segments.push(pathSegment); 

								pathLength = pathLength + segmentLength - c1.location;

							}
							else if(referenceId == c2.referenceId) {

								var pathSegment:PathSegment = new PathSegment();
								pathSegment.referenceId = referenceId;
								
								pathSegment.fromIntersectionId = this.fromIntersectionIdForRefId(referenceId); 
								pathSegment.toIntersectionId = this.toIntersectionIdForRefId(referenceId);
			
								// if(this.includeStreetnames) {
								// 	pathSegment.fromStreetnames = await this.streetnamesForIntersectionId(pathSegment.fromIntersectionId, pathSegment.referenceId);	
								// 	pathSegment.toStreetnames = await this.streetnamesForIntersectionId(pathSegment.toIntersectionId, pathSegment.referenceId);	
								// }

								pathSegment.roadClass = segementGeom.roadClass;
								pathSegment.direction = this.directionForRefId(referenceId);
								pathSegment.geometryId = segmentRef.geometryId;

								// if(this.includeStreetnames) {
								// 	var metadata = await this.cache.metadataById(pathSegment.geometryId);
								// 	pathSegment.streetname = metadata.name;
								// }

								pathSegment.referenceLength = segmentLength;

								pathSegment.section = [0, c2.location];
							
								if(c2.location != 0)
									segments.push(pathSegment); 
												
								pathLength = pathLength + c2.location; 

							}
							else {

								var pathSegment:PathSegment = new PathSegment();
								pathSegment.referenceId = referenceId;

								pathSegment.fromIntersectionId = this.fromIntersectionIdForRefId(referenceId); 
								pathSegment.toIntersectionId = this.toIntersectionIdForRefId(referenceId);

								// if(this.includeStreetnames) {
								// 	pathSegment.fromStreetnames = await this.streetnamesForIntersectionId(pathSegment.fromIntersectionId, pathSegment.referenceId);	
								// 	pathSegment.toStreetnames = await this.streetnamesForIntersectionId(pathSegment.toIntersectionId, pathSegment.referenceId);	
								// }

								pathSegment.roadClass = segementGeom.roadClass;
								pathSegment.direction = this.directionForRefId(referenceId);
								pathSegment.geometryId = segmentRef.geometryId;

								// if(this.includeStreetnames) {
								// 	var metadata = await this.cache.metadataById(pathSegment.geometryId);
								// 	pathSegment.streetname = metadata.name;
								// }
								
								pathSegment.section = [0, segmentLength];

								pathSegment.referenceLength = segmentLength;

								segments.push(pathSegment); 
	
								pathLength = pathLength + segmentLength; 

							}
						}
						
						pathCandidate.segments = segments;

						if(matchFormOfWay) {
							candidates.push(pathCandidate);	
						}	

						routeCount++;
					}
				}
			}
		}
	
		return candidates;
				
	}	

	async getPathCandidatesForDirectedFeature(originalFeature:turfHelpers.Feature<turfHelpers.LineString>, direction:ReferenceDirection):Promise<PathCandidate[]> {
		
		var formOfWay = null;

		if(originalFeature.properties.filterParameters && originalFeature.properties.filterParameters.formOfWay) {
			formOfWay = originalFeature.properties.filterParameters.formOfWay;
		}

		var reference:SharedStreetsReference;

		if(direction == ReferenceDirection.FORWARD)
			reference = forwardReference(originalFeature);
		else
			reference = backReference(originalFeature);

		var sortCandidates = (l) => {

			return l.sort((p1:PathCandidate, p2:PathCandidate) => {
			p1.calcScore();
			p2.calcScore();	

			if(p1 && p2 && p1.score > p2.score) {
				return 1;
			}
			else if(p1 && p2 && p1.score < p2.score) {
				return -1;
			}
			else {
				if(p1 && p2 && p1.sideOfStreet == ReferenceSideOfStreet.UNKNOWN && p2.sideOfStreet != ReferenceSideOfStreet.UNKNOWN)
					return 1;
				if(p1 && p2 && p2.sideOfStreet == ReferenceSideOfStreet.UNKNOWN && p1.sideOfStreet != ReferenceSideOfStreet.UNKNOWN)
					return -1;	
				else
					return 0;
			}

		})};

		var referenceCandidates = await this.getPathCandidatesForRef(reference, originalFeature, formOfWay);		
		
		var sortedReferenceCandidates = sortCandidates(referenceCandidates);
	
		return sortedReferenceCandidates;

	}

	async getPathCandidateForFeature(originalFeature:turfHelpers.Feature<turfHelpers.LineString>):Promise<PathCandidate[]> {

		var matchedCandidates:PathCandidate[] = [];

		var forwardCandidates:PathCandidate[] = await this.getPathCandidatesForDirectedFeature(originalFeature, ReferenceDirection.FORWARD);

		if(this.ignoreDirection) {
			var backwardCandidates:PathCandidate[] = await this.getPathCandidatesForDirectedFeature(originalFeature, ReferenceDirection.BACKWARD);
		
			if(backwardCandidates.length > 0 && forwardCandidates.length == 0) {
				// for one-way matches just return backward candidates
				matchedCandidates.push(backwardCandidates[0]);
			}
			else if(backwardCandidates.length == 0 && forwardCandidates.length > 0) {
				// for one-way matches just return backward candidates
				matchedCandidates.push(forwardCandidates[0]);
			}
			else if(backwardCandidates.length > 0 && forwardCandidates.length > 0) {
				
				if(forwardCandidates[0].sideOfStreet != ReferenceSideOfStreet.UNKNOWN && backwardCandidates[0].sideOfStreet == ReferenceSideOfStreet.UNKNOWN) {
					matchedCandidates.push(forwardCandidates[0]);
				}
				else if(forwardCandidates[0].sideOfStreet == ReferenceSideOfStreet.UNKNOWN && backwardCandidates[0].sideOfStreet != ReferenceSideOfStreet.UNKNOWN) {
					matchedCandidates.push(backwardCandidates[0]);
				}
				else {
					// for bi-directional matches make sure forward and back macth share the same geometry or are parallel
					if(forwardCandidates[0].isColinear(backwardCandidates[0]) || forwardCandidates[0].isParallel(backwardCandidates[0], this.bearingTolerance)) {
						matchedCandidates.push(forwardCandidates[0]);
						matchedCandidates.push(backwardCandidates[0]);
					}
				}
			}
		
		}
		else if (forwardCandidates.length > 0 ){
			// for one-way matches just return forward candidates
			matchedCandidates.push(forwardCandidates[0]);
		}

		return matchedCandidates;
	}

	async matchFeatureCollection(lines:turfHelpers.FeatureCollection<turfHelpers.LineString>) {

		var matchedReferences:PathCandidate[] = [];
		var unmatchedFeatures:turfHelpers.FeatureCollection<turfHelpers.LineString> =  turfHelpers.featureCollection([]);
		var matchedFeatures:turfHelpers.FeatureCollection<turfHelpers.LineString> = turfHelpers.featureCollection([]);

		for(var originalFeature of lines.features) {
			
			var featureParts:turfHelpers.Feature<turfHelpers.LineString>[] = [];

			var featureLength = length(originalFeature, {units: 'meters'});

			if(featureLength > MAX_FEATURE_LENGTH) {

				var numParts = Math.ceil(featureLength / MAX_FEATURE_LENGTH);
				var partLength = featureLength / numParts;

				for(var i = 0; i < numParts; i++) {
					var linePart = lineSliceAlong(originalFeature, partLength * i, partLength * (i + 1), {units: 'meters'});

					// make sure first coord of each part matches last coord of previous part
					if(featureParts.length > 0){
						var featurePartCoords = featureParts[featureParts.length -1].geometry.coordinates.length;
						var lastCoord = featureParts[featureParts.length -1].geometry.coordinates[featurePartCoords - 1];
						linePart.geometry.coordinates[0] = lastCoord;
					}
					linePart.properties = Object.assign({}, originalFeature.properties);
					featureParts.push(linePart);
				}
			}
			else {
				featureParts.push(originalFeature);
			}

			for(var featurePart of featureParts ) {

				

				var refs = await this.getPathCandidateForFeature(featurePart);
				if(refs.length == 0) {
					unmatchedFeatures.features.push(featurePart);
				} 

				matchedReferences = matchedReferences.concat(refs);

			}
		}

		for(var ref of matchedReferences) {
			var firstIntersection = true;

			for(var segment of ref.segments) {

				var segmentGeom = null;

				if(segment.section)
					segmentGeom = await this.tileIndex.geom(segment.referenceId, segment.section[0], segment.section[1]);
				else if(segment.point)
					segmentGeom = await this.tileIndex.geom(segment.referenceId, segment.point, null);
				else 
					segmentGeom = await this.tileIndex.geom(segment.referenceId, null, null);

				if(segmentGeom != null) {
					segmentGeom.properties = Object.assign({}, segment);
					segmentGeom.properties['side'] = ref.sideOfStreet;
					segmentGeom.properties['score'] = ref.score;
					matchedFeatures.features.push(segmentGeom)
				}
			}
		}

		return { matched:matchedFeatures, unmatched:unmatchedFeatures };
	}

	// async getReferenceCandidates(originalFeature:turfHelpers.Feature<turfHelpers.LineString>, direction:ReferenceDirection):Promise<PathCandidate[]> {
		
	// 	var formOfWay = null;

	// 	if(originalFeature.properties.filterParameters && originalFeature.properties.filterParameters.formOfWay) {
	// 		formOfWay = originalFeature.properties.filterParameters.formOfWay;
	// 	}

	// 	var reference:SharedStreetsReference;

	// 	if(direction == ReferenceDirection.FORWARD)
	// 		reference = sharedstreets.forwardReference(originalFeature);
	// 	else
	// 		reference = sharedstreets.backReference(originalFeature);

	// 	var sortCandidates = (l) => {

	// 		return l.sort((p1:PathCandidate, p2:PathCandidate) => {
	// 		p1.calcScore();
	// 		p2.calcScore();	

	// 		if(p1 && p2 && p1.score > p2.score) {
	// 			return 1;
	// 		}
	// 		else if(p1 && p2 && p1.score < p2.score) {
	// 			return -1;
	// 		}
	// 		else {
	// 			if(p1 && p2 && p1.sideOfStreet == ReferenceSideOfStreet.UNKNOWN && p2.sideOfStreet != ReferenceSideOfStreet.UNKNOWN)
	// 				return 1;
	// 			if(p1 && p2 && p2.sideOfStreet == ReferenceSideOfStreet.UNKNOWN && p1.sideOfStreet != ReferenceSideOfStreet.UNKNOWN)
	// 				return -1;	
	// 			else
	// 				return 0;
	// 		}

	// 	})};

	// 	var referenceCandidates = await this.getCandidatesForRef(reference, originalFeature, formOfWay);		
		
	// 	var sortedReferenceCandidates = sortCandidates(referenceCandidates);
	
	// 	return sortedReferenceCandidates;

	// }

	// async getReferencesForFeature(originalFeature:turfHelpers.Feature<turfHelpers.LineString>):Promise<PathCandidate[]> {

	// 	var matchedCandidates:PathCandidate[] = [];

	// 	var forwardCandidates:PathCandidate[] = await this.getReferenceCandidates(originalFeature, ReferenceDirection.FORWARD);

	// 	if(this.ignoreDirection) {
	// 		var backwardCandidates:PathCandidate[] = await this.getReferenceCandidates(originalFeature, ReferenceDirection.BACKWARD);
		
	// 		if(backwardCandidates.length > 0 && forwardCandidates.length == 0) {
	// 			// for one-way matches just return backward candidates
	// 			matchedCandidates.push(backwardCandidates[0]);
	// 		}
	// 		else if(backwardCandidates.length == 0 && forwardCandidates.length > 0) {
	// 			// for one-way matches just return backward candidates
	// 			matchedCandidates.push(forwardCandidates[0]);
	// 		}
	// 		else if(backwardCandidates.length > 0 && forwardCandidates.length > 0) {
				
	// 			if(forwardCandidates[0].sideOfStreet != ReferenceSideOfStreet.UNKNOWN && backwardCandidates[0].sideOfStreet == ReferenceSideOfStreet.UNKNOWN) {
	// 				matchedCandidates.push(forwardCandidates[0]);
	// 			}
	// 			else if(forwardCandidates[0].sideOfStreet == ReferenceSideOfStreet.UNKNOWN && backwardCandidates[0].sideOfStreet != ReferenceSideOfStreet.UNKNOWN) {
	// 				matchedCandidates.push(backwardCandidates[0]);
	// 			}
	// 			else {
	// 				// for bi-directional matches make sure forward and back macth share the same geometry or are parallel
	// 				if(forwardCandidates[0].isColinear(backwardCandidates[0]) || forwardCandidates[0].isParallel(backwardCandidates[0], this.bearingTolerance)) {
	// 					matchedCandidates.push(forwardCandidates[0]);
	// 					matchedCandidates.push(backwardCandidates[0]);
	// 				}
	// 			}
	// 		}
		
	// 	}
	// 	else if (forwardCandidates.length > 0 ){
	// 		// for one-way matches just return forward candidates
	// 		matchedCandidates.push(forwardCandidates[0]);
	// 	}

	// 	return matchedCandidates;
	// }

}
	
// export async function point(event, cache:LocalCache, callback) {

// 	var parts = decodeURIComponent(event.pathParameters.data).split(",");

// 	var lon = Number.parseFloat(parts[0]);
// 	var lat = Number.parseFloat(parts[1]);

// 	var pointBearing = null;

// 	if(parts.length > 2)
// 	    pointBearing = Number.parseFloat(parts[2]);

// 	var matcher = new Matcher(cache);
// 	matcher.parseQueryString(event.queryStringParameters);

// 	var maxCandidates = DEFUALT_CANDIDATES;
// 	if(event.queryStringParameters && event.queryStringParameters.maxCandidates) {
// 		maxCandidates = Number.parseFloat(event.queryStringParameters.maxCandidates);
// 		if(maxCandidates > MAX_CANDIDATES) 
// 			maxCandidates = MAX_CANDIDATES;
// 	}

// 	var searchPoint:turfHelpers.Feature<turfHelpers.Point> = turfHelpers.point([lon, lat]);
// 	var candidates:PointCandidate[] = await matcher.getPointCandidates(searchPoint, pointBearing, maxCandidates);
// 	var features:turfHelpers.Feature<turfHelpers.Point>[] = candidates.map((f):turfHelpers.Feature<turfHelpers.Point> => {return f.toFeature()}); 

// 	var results = turfHelpers.featureCollection(features);

// 	callback(null, results);

// }


// export async function points(inputData, thil) {
	
// 	var matcher = new Matcher();

// 	var features = cleanPoints(inputData);

// 	var unmatchedFeatures:turfHelpers.FeatureCollection = {type:'FeatureCollection', features:[]};
// 	var matchedFeatures:turfHelpers.FeatureCollection = {type:'FeatureCollection', features:[]};
// 	var invalidFeatures:turfHelpers.FeatureCollection = {type:'FeatureCollection', features:features.invalid};

// 	for(var originalFeature of features.clean) { 

// 		var pointBearing = null;

// 		if(originalFeature.properties && originalFeature.properties.bearing)
// 			pointBearing = originalFeature.properties.bearing;

// 		var candidates:PointCandidate[] = await matcher.getPointCandidates(originalFeature, pointBearing, 1);
// 		var pointCandidates:turfHelpers.Feature<turfHelpers.Point>[] = candidates.map((f):turfHelpers.Feature<turfHelpers.Point> => {return f.toFeature()});

// 		if(pointCandidates.length == 0)
// 			unmatchedFeatures.features.push(originalFeature);
// 		else {
// 			var matchedPoint = pointCandidates[0];
// 			matchedPoint.properties['originalFeature'] = originalFeature;
// 			matchedFeatures.features.push(matchedPoint);
// 		}
		
// 	}
// }

// export async function geom(event, cache:LocalCache, callback) {

// 	var matcher = new Matcher(cache);
// 	matcher.parseQueryString(event.queryStringParameters);

// 	var inputData = JSON.parse(event.body);
// 	var features = cleanGeometry(inputData);

// 	var matchedReferences:PathCandidate[] = [];
// 	var unmatchedFeatures:FeatureCollection = {type:'FeatureCollection', features:[]};
// 	var matchedFeatures:FeatureCollection = {type:'FeatureCollection', features:[]};
// 	var invalidFeatures:FeatureCollection = {type:'FeatureCollection', features:features.invalid};

// 	for(var originalFeature of features.clean) {
		
// 		var featureParts:Feature<LineString>[] = [];

// 		var featureLength = length(originalFeature, {units: 'meters'});

// 		if(featureLength > MAX_FEATURE_LENGTH) {

// 			var numParts = Math.ceil(featureLength / MAX_FEATURE_LENGTH);
// 			var partLength = featureLength / numParts;

// 			for(var i = 0; i < numParts; i++) {
// 				var linePart = lineSliceAlong(originalFeature, partLength * i, partLength * (i + 1), {units: 'meters'});

// 				// make sure first coord of each part matches last coord of previous part
// 				if(featureParts.length > 0){
// 					var featurePartCoords = featureParts[featureParts.length -1].geometry.coordinates.length;
// 					var lastCoord = featureParts[featureParts.length -1].geometry.coordinates[featurePartCoords - 1];
// 					linePart.geometry.coordinates[0] = lastCoord;
// 				}
// 				linePart.properties = Object.assign({}, originalFeature.properties);
// 				featureParts.push(linePart);
// 			}
// 		}
// 		else {
// 			featureParts.push(originalFeature);
// 		}

// 		for(var featurePart of featureParts ) {

			

// 			var refs = await matcher.getReferencesForFeature(featurePart);
// 			if(refs.length == 0) {
// 				unmatchedFeatures.features.push(featurePart);
// 			} 

// 			matchedReferences = matchedReferences.concat(refs);

// 		}
// 	}

// 	for(var ref of matchedReferences) {

// 		var firstIntersection = true;
// 		for(var segment of ref.segments) {

// 			if(matcher.includeIntersections) {
// 				if(firstIntersection) {
// 					var fromIntersection = cache.idIndex[segment.fromIntersectionId];
// 					matchedFeatures.features.push(fromIntersection.feature);
// 					firstIntersection = false;
// 				}
// 			}

// 			var segmentGeom = null;

// 			if(segment.section)
// 				segmentGeom = await cache.geom(segment.referenceId, segment.section[0], segment.section[1]);
// 			else if(segment.point)
// 				segmentGeom = await cache.geom(segment.referenceId, segment.point, null);
// 			else 
// 				segmentGeom = await cache.geom(segment.referenceId, null, null);

// 			if(segmentGeom != null) {
// 				segmentGeom.properties = Object.assign({}, segment);
// 				segmentGeom.properties['side'] = ref.sideOfStreet;
// 				segmentGeom.properties['score'] = ref.score;
// 				segmentGeom.properties['originalFeature'] = ref.originalFeature;
// 				matchedFeatures.features.push(segmentGeom)
// 			}

// 			if(matcher.includeIntersections) {
// 				var toIntersection = cache.idIndex[segment.toIntersectionId]; 
// 				matchedFeatures.features.push(toIntersection.feature);
// 			}
// 		}
// 	}

// 	callback(null, { matched:matchedFeatures, unmatched:unmatchedFeatures, invalid:invalidFeatures });
// }

// export async function geoms(event, cache:LocalCache, callback) {

// 	var matcher = new Matcher(cache);
// 	matcher.parseQueryString(event.queryStringParameters);

// 	var inputData = JSON.parse(event.body);
// 	var features = cleanGeometry(inputData);

//     var matchedReferences:PathCandidate[] = [];
// 	var unmatchedFeatures:turfHelpers.FeatureCollection = {type:'FeatureCollection', features:[]};
// 	var matchedFeatures:turfHelpers.FeatureCollection = {type:'FeatureCollection', features:[]};
// 	var invalidFeatures:turfHelpers.FeatureCollection = {type:'FeatureCollection', features:features.invalid};

// 	for(var originalFeature of features.clean) {
		
// 		var featureParts:turfHelpers.Feature<turfHelpers.LineString>[] = [];

// 		var featureLength = length(originalFeature, {units: 'meters'});

// 		if(featureLength > MAX_FEATURE_LENGTH) {

// 			var numParts = Math.ceil(featureLength / MAX_FEATURE_LENGTH);
// 			var partLength = featureLength / numParts;

// 			for(var i = 0; i < numParts; i++) {
// 				var linePart = lineSliceAlong(originalFeature, partLength * i, partLength * (i + 1), {units: 'meters'});

// 				// make sure first coord of each part matches last coord of previous part
// 				if(featureParts.length > 0){
// 					var featurePartCoords = featureParts[featureParts.length -1].geometry.coordinates.length;
// 					var lastCoord = featureParts[featureParts.length -1].geometry.coordinates[featurePartCoords - 1];
// 					linePart.geometry.coordinates[0] = lastCoord;
// 				}
// 				linePart.properties = Object.assign({}, originalFeature.properties);
// 				featureParts.push(linePart);
// 			}
// 		}
// 		else {
// 			featureParts.push(originalFeature);
// 		}

// 		for(var featurePart of featureParts ) {

			

// 			var refs = await matcher.getReferencesForFeature(featurePart);
// 			if(refs.length == 0) {
// 				unmatchedFeatures.features.push(featurePart);
// 			} 

// 			matchedReferences = matchedReferences.concat(refs);

// 		}
// 	}

// 	for(var ref of matchedReferences) {
// 		var firstIntersection = true;

// 		for(var segment of ref.segments) {

// 			var segmentGeom = null;

// 			if(segment.section)
// 				segmentGeom = await cache.geom(segment.referenceId, segment.section[0], segment.section[1]);
// 			else if(segment.point)
// 				segmentGeom = await cache.geom(segment.referenceId, segment.point, null);
// 			else 
// 				segmentGeom = await cache.geom(segment.referenceId, null, null);

// 			if(segmentGeom != null) {
// 				segmentGeom.properties = Object.assign({}, segment);
// 				segmentGeom.properties['side'] = ref.sideOfStreet;
// 				segmentGeom.properties['score'] = ref.score;
// 				segmentGeom.properties['originalFeature'] = ref.originalFeature;
// 				matchedFeatures.features.push(segmentGeom)
// 			}
// 		}
// 	}

// 	callback(null, { matched:matchedFeatures, unmatched:unmatchedFeatures, invalid:invalidFeatures });
// }
