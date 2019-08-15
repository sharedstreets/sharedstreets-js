
//import redis = require('redis');

//import { SharedStreetsMetadata, SharedStreetsIntersection, SharedStreetsGeometry, SharedStreetsReference, RoadClass  } from 'sharedstreets-types';

import * as turfHelpers from '@turf/helpers';
import buffer from '@turf/buffer';
import along from '@turf/along';

import envelope from '@turf/envelope';
import lineSliceAlong from '@turf/line-slice-along';
import distance from '@turf/distance';
import lineOffset from '@turf/line-offset';

import  RBush from 'rbush';

import { SharedStreetsIntersection, SharedStreetsGeometry, SharedStreetsReference, SharedStreetsMetadata } from 'sharedstreets-types';

import { lonlatsToCoords } from '../src/index';
import { TilePath, getTile, TileType, TilePathGroup, getTileIdsForPolygon, TilePathParams, getTileIdsForPoint } from './tiles';
import { Graph, ReferenceSideOfStreet } from './graph';
import { reverseLineString, bboxFromPolygon } from './geom';
import { featureCollection } from '@turf/helpers';

const SHST_ID_API_URL = 'https://api.sharedstreets.io/v0.1.0/id/';

// maintains unified spaital and id indexes for tiled data

export function createIntersectionGeometry(data:SharedStreetsIntersection) {
    var point = turfHelpers.point([data.lon, data.lat]);
    return turfHelpers.feature(point.geometry, {id: data.id});
}

export function getReferenceLength(ref:SharedStreetsReference) {
    var refLength = 0;
    for(var locationRef of ref.locationReferences) {
        if(locationRef.distanceToNextRef)
        refLength = refLength = locationRef.distanceToNextRef
    }
    return refLength / 100;
}

export function createGeometry(data:SharedStreetsGeometry) {
    
    var line = turfHelpers.lineString(lonlatsToCoords(data.lonlats));
    var feature = turfHelpers.feature(line.geometry, {id: data.id});
    return feature;
} 

export class TileIndex {

    tiles:Set<string>;
    objectIndex:Map<string, {}>;
    featureIndex:Map<string, turfHelpers.Feature<turfHelpers.Geometry>>;
    metadataIndex:Map<string, {}>;
    osmNodeIntersectionIndex:Map<string, any>;
    osmNodeIndex:Map<string, any>;
    osmWayIndex:Map<string, any>;
    binIndex:Map<string, turfHelpers.Feature<turfHelpers.MultiPoint>>;

    intersectionIndex:RBush;
    geometryIndex:RBush;

    additionalTileTypes:TileType[] = [];

    constructor() {

        this.tiles = new Set();
        this.objectIndex = new Map();
        this.featureIndex = new Map();
        this.metadataIndex = new Map();
        this.osmNodeIntersectionIndex = new Map();
        this.osmNodeIndex = new Map();
        this.osmWayIndex = new Map();
        this.binIndex = new Map();

        this.intersectionIndex = new RBush(9);
        this.geometryIndex = new RBush(9);
    }

    addTileType(tileType:TileType) {
        this.additionalTileTypes.push(tileType);
    }
 

    isIndexed(tilePath:TilePath):Boolean {
        if(this.tiles.has(tilePath.toPathString()))
            return true;
        else   
            return false;
    }

    async indexTilesByPathGroup(tilePathGroup:TilePathGroup):Promise<boolean> {

        for(var tilePath of tilePathGroup) {
            await this.indexTileByPath(tilePath);
        }

        return false;
    }

    async indexTileByPath(tilePath:TilePath):Promise<boolean> {

        if(this.isIndexed(tilePath)) 
            return true;
        
        var data:any[] = await getTile(tilePath);
        
        if(tilePath.tileType === TileType.GEOMETRY) {            
            var geometryFeatures = [];
            for(var geometry of data) {
                if(!this.objectIndex.has(geometry.id)) {
                    this.objectIndex.set(geometry.id, geometry);  
                    var geometryFeature = createGeometry(geometry);      
                    this.featureIndex.set(geometry.id, geometryFeature)  
                    var bboxCoords = bboxFromPolygon(geometryFeature);
                    bboxCoords['id'] = geometry.id;
                    geometryFeatures.push(bboxCoords);    
                }
            }           
            this.geometryIndex.load(geometryFeatures); 
        }
        else if(tilePath.tileType === TileType.INTERSECTION) {
            var intersectionFeatures = [];
            for(var intersection of data) {
                if(!this.objectIndex.has(intersection.id)) {
                    this.objectIndex.set(intersection.id, intersection);   
                    var intesectionFeature = createIntersectionGeometry(intersection);
                    this.featureIndex.set(intersection.id, intesectionFeature);
                    this.osmNodeIntersectionIndex.set(intersection.nodeId, intersection);
                    var bboxCoords = bboxFromPolygon(intesectionFeature); 
                    bboxCoords['id'] = intersection.id;
                    intersectionFeatures.push(bboxCoords);    
                }
            } 
            this.intersectionIndex.load(intersectionFeatures);
        }
        else if(tilePath.tileType === TileType.REFERENCE) {
            for(var reference of data) {
                this.objectIndex.set(reference.id, reference);
            }
        }
        else if(tilePath.tileType === TileType.METADATA) {
            for(var metadata of <SharedStreetsMetadata[]>data) {
                this.metadataIndex.set(metadata.geometryId, metadata);             
                if(metadata.osmMetadata) {
                    for(var waySection of metadata.osmMetadata.waySections) {

                        if(!this.osmWayIndex.has("" + waySection.wayId))
                            this.osmWayIndex.set("" + waySection.wayId, [])

                        var ways = this.osmWayIndex.get("" + waySection.wayId);
                        ways.push(metadata);
                        this.osmWayIndex.set("" + waySection.wayId, ways);   

                        for(var nodeId of waySection.nodeIds) {

                            if(!this.osmNodeIndex.has("" + nodeId))
                                this.osmNodeIndex.set("" + nodeId, []);

                            var nodes = this.osmNodeIndex.get("" + nodeId);
                            nodes.push(metadata);
                            this.osmNodeIndex.set("" + nodeId, nodes);  
                        }
                    }
                }            
            } 
        }

        this.tiles.add(tilePath.toPathString());
    }

    async getGraph(polygon:turfHelpers.Feature<turfHelpers.Polygon>, params:TilePathParams):Promise<Graph> {
        return null;
    }

    async intersects(polygon:turfHelpers.Feature<turfHelpers.Polygon>, searchType:TileType, buffer:number, params:TilePathParams):Promise<turfHelpers.FeatureCollection<turfHelpers.Geometry>> {

        var tilePaths = TilePathGroup.fromPolygon(polygon, buffer, params);

        if(searchType === TileType.GEOMETRY)
            tilePaths.addType(TileType.GEOMETRY);
        else if(searchType === TileType.INTERSECTION)
            tilePaths.addType(TileType.INTERSECTION);
        else 
            throw "invalid search type must be GEOMETRY or INTERSECTION";

        if(this.additionalTileTypes.length > 0) {
            for(var type of this.additionalTileTypes) {
                tilePaths.addType(type);
            }
        }

        await this.indexTilesByPathGroup(tilePaths);

        var data:turfHelpers.FeatureCollection<turfHelpers.Geometry> = featureCollection([]);
        
        if(searchType === TileType.GEOMETRY){
            var bboxCoords = bboxFromPolygon(polygon);
            var rbushMatches = this.geometryIndex.search(bboxCoords);

            for(var rbushMatch of rbushMatches) {
                var matchedGeom = this.featureIndex.get(rbushMatch.id);
                data.features.push(matchedGeom);
            }
        }   
        else if(searchType === TileType.INTERSECTION) {
            var bboxCoords = bboxFromPolygon(polygon);
            var rbushMatches = this.intersectionIndex.search(bboxCoords);
            for(var rbushMatch of rbushMatches) {
                var matchedGeom = this.featureIndex.get(rbushMatch.id);
                data.features.push(matchedGeom);
            }
        }
        
        return data;
    }

    async nearby(point:turfHelpers.Feature<turfHelpers.Point>, searchType:TileType, searchRadius:number, params:TilePathParams) {

        var tilePaths = TilePathGroup.fromPoint(point, searchRadius * 2, params);

        if(searchType === TileType.GEOMETRY)
            tilePaths.addType(TileType.GEOMETRY);
        else if(searchType === TileType.INTERSECTION)
            tilePaths.addType(TileType.INTERSECTION);
        else 
            throw "invalid search type must be GEOMETRY or INTERSECTION"

        if(this.additionalTileTypes.length > 0) {
            for(var type of this.additionalTileTypes) {
                tilePaths.addType(type);
            }
        }

        await this.indexTilesByPathGroup(tilePaths);

        var bufferedPoint:turfHelpers.Feature<turfHelpers.Polygon> = buffer(point, searchRadius, {'units':'meters'});
        var data:turfHelpers.FeatureCollection<turfHelpers.Geometry> = featureCollection([]);

        if(searchType === TileType.GEOMETRY){
            var bboxCoords = bboxFromPolygon(bufferedPoint);
            var rbushMatches = this.geometryIndex.search(bboxCoords);

            for(var rbushMatch of rbushMatches) {
                var matchedGeom = this.featureIndex.get(rbushMatch.id);
                data.features.push(matchedGeom);
            }
        }
        else if(searchType === TileType.INTERSECTION) {
            var bboxCoords = bboxFromPolygon(bufferedPoint);
            var rbushMatches = this.intersectionIndex.search(bboxCoords);

            for(var rbushMatch of rbushMatches) {
                var matchedGeom = this.featureIndex.get(rbushMatch.id);
                data.features.push(matchedGeom);
            }
        }

        return data;
    
    }

    async geomFromOsm(wayId:string, nodeId1:string, nodeId2:string, offset:number=0):Promise<turfHelpers.Feature<turfHelpers.LineString|turfHelpers.Point>> {
        

        if(this.osmNodeIntersectionIndex.has(nodeId1) && this.osmNodeIntersectionIndex.has(nodeId2)) {
            var intersection1 = <SharedStreetsIntersection>this.osmNodeIntersectionIndex.get(nodeId1);
            var intersection2 = <SharedStreetsIntersection>this.osmNodeIntersectionIndex.get(nodeId2);

            var referenceCandidates:Set<string> = new Set();
            
            for(var refId of intersection1.outboundReferenceIds) {
                referenceCandidates.add(refId);
            }

            for(var refId of intersection2.inboundReferenceIds) {
                if(referenceCandidates.has(refId)) {
                    var geom = await this.geom(refId, null, null, offset);
                    if(geom) {
                        geom.properties['referenceId'] = refId;
                        return geom;
                    }
                }
            }
        }
        else if(this.osmWayIndex.has(wayId)) {
            var metadataList = <SharedStreetsMetadata[]>this.osmWayIndex.get(wayId);

            for(var metadata of metadataList) {
                var nodeIds = [];
                var previousNode = null;
                var nodeIndex = 0;
                var startNodeIndex = null;
                var endNodeIndex = null;
                for(var waySection of metadata.osmMetadata.waySections) {
                    for(var nodeId of waySection.nodeIds) {
                        var nodeIdStr = nodeId + "";
                        if(previousNode != nodeIdStr) {
                            nodeIds.push(nodeIdStr);

                            if(nodeIdStr == nodeId1)
                                startNodeIndex = nodeIndex;
                            if(nodeIdStr == nodeId2)
                                endNodeIndex = nodeIndex;

                            nodeIndex++;
                        }
                        previousNode = nodeIdStr;
                    }
                }

                if(startNodeIndex  != null && endNodeIndex != null) {
                    var geometry = <SharedStreetsGeometry>this.objectIndex.get(metadata.geometryId);
                    var geometryFeature = this.featureIndex.get(metadata.geometryId);
                    var reference = <SharedStreetsReference>this.objectIndex.get(geometry.forwardReferenceId);

                    if(startNodeIndex > endNodeIndex) {
                        if(geometry.backReferenceId) {
                            nodeIds.reverse();
                            startNodeIndex = (nodeIds.length - 1) - startNodeIndex;
                            endNodeIndex = (nodeIds.length - 1) - endNodeIndex;

                            reference = <SharedStreetsReference>this.objectIndex.get(geometry.backReferenceId);
                            geometryFeature = <turfHelpers.Feature<turfHelpers.LineString>>JSON.parse(JSON.stringify(geometryFeature));
                            geometryFeature.geometry.coordinates = geometryFeature.geometry.coordinates.reverse();
                        }
                    }

                    var startLocation = 0;
                    var endLocation = 0; 
                    var previousCoord = null;
                    for(var j = 0; j <= endNodeIndex;  j++ ){
                        if(previousCoord) {
                            try {
                                var coordDistance = distance(previousCoord, geometryFeature.geometry.coordinates[j], {units: 'meters'});
                                if(j <= startNodeIndex)
                                    startLocation += coordDistance;
                                endLocation += coordDistance;
                            }
                            catch(e) {
                                console.log(e);
                            }                               
                        }
                        previousCoord = geometryFeature.geometry.coordinates[j];
                    }
            
                    //console.log(wayId + " " + nodeId1 + " " + nodeId2 + ": " + reference.id + " " + startLocation + " " + endLocation);

                    var geom = await this.geom(reference.id, startLocation, endLocation, offset);
                    if(geom) {
                        geom.properties['referenceId'] = reference.id;
                        geom.properties['section'] = [startLocation, endLocation];
                        return geom;
                    }
                }
            }
        }

        return null;
    }
    
    referenceToBins(referenceId:string, numBins:number, offset:number, sideOfStreet:ReferenceSideOfStreet):turfHelpers.Feature<turfHelpers.MultiPoint> {
        var binIndexId = referenceId + ':' + numBins + ':' + offset;

        if(this.binIndex.has(binIndexId))
            return this.binIndex.get(binIndexId);

        var ref = <SharedStreetsReference>this.objectIndex.get(referenceId);
        var geom = <SharedStreetsGeometry>this.objectIndex.get(ref.geometryId);
        var feature = <turfHelpers.Feature<turfHelpers.LineString>>this.featureIndex.get(ref.geometryId);

        var binLength = getReferenceLength(ref) / numBins;

        var binPoints:turfHelpers.Feature<turfHelpers.MultiPoint> = {
            "type": "Feature",
            "properties": { "id":referenceId },
            "geometry": {
                "type": "MultiPoint",
                "coordinates": []
            }
        }

        try {
            if(offset) { 
                if(referenceId === geom.forwardReferenceId)
                    feature = lineOffset(feature, offset, {units: 'meters'});
                else {
                    var reverseGeom = reverseLineString(feature);
                    feature = lineOffset(reverseGeom, offset, {units: 'meters'});
                }
            }
            for(var binPosition = 0; binPosition < numBins; binPosition++) {
                try {
                    var point = along(feature, (binLength * binPosition) + (binLength/2), {units:'meters'});
                    point.geometry.coordinates[0] = Math.round(point.geometry.coordinates[0] * 10000000) / 10000000;
                    point.geometry.coordinates[1] = Math.round(point.geometry.coordinates[1] * 10000000) / 10000000;
                    binPoints.geometry.coordinates.push(point.geometry.coordinates);
                }
                catch(e) {
                    console.log(e);
                }
            }
            this.binIndex.set(binIndexId, binPoints);
        }
        catch(e) {
            console.log(e);
        }

        return binPoints;
    }

    async geom(referenceId:string, p1:number, p2:number, offset:number=0):Promise<turfHelpers.Feature<turfHelpers.LineString|turfHelpers.Point>> {
        
        if(this.objectIndex.has(referenceId)) {
            var ref:SharedStreetsReference = <SharedStreetsReference>this.objectIndex.get(referenceId);
            var geom:SharedStreetsGeometry = <SharedStreetsGeometry>this.objectIndex.get(ref.geometryId);

            var geomFeature:turfHelpers.Feature<turfHelpers.LineString> = JSON.parse(JSON.stringify(this.featureIndex.get(ref.geometryId)));

            if(geom.backReferenceId && geom.backReferenceId === referenceId) {                
                geomFeature.geometry.coordinates = geomFeature.geometry.coordinates.reverse()
            }

            if(p1 < 0)
                p1 = 0;
            if(p2 < 0)
                p2 = 0;
            var finalFeature;
            if(p1 == null && p2 == null) {
                finalFeature = geomFeature;
            }
            else if(p1 && p2 == null) {
                finalFeature = along(geomFeature, p1, {"units":"meters"});
            } 
            else if(p1 != null && p2 != null) {
                try {
                    finalFeature = lineSliceAlong(geomFeature, p1, p2, {"units":"meters"});
                }
                catch(e) {
                    //console.log(p1, p2)
                }
                
            }

            if(offset) {
                return lineOffset(finalFeature, offset, {units: 'meters'});
            }
            else 
                return finalFeature;
        }

        // TODO find missing IDs via look up
        return null;
    }
}
