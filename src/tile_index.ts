
//import redis = require('redis');

//import { SharedStreetsMetadata, SharedStreetsIntersection, SharedStreetsGeometry, SharedStreetsReference, RoadClass  } from 'sharedstreets-types';

import * as turfHelpers from '@turf/helpers';
import buffer from '@turf/buffer';
import along from '@turf/along';

import envelope from '@turf/envelope';
import lineSliceAlong from '@turf/line-slice-along';
import lineOffset from '@turf/line-offset';

import geojsonRbush, { RBush } from 'geojson-rbush';

import { SharedStreetsIntersection, SharedStreetsGeometry, SharedStreetsReference } from 'sharedstreets-types';

import { lonlatsToCoords } from '../src/index';
import { TilePath, getTile, TileType, TilePathGroup, getTileIdsForPolygon, TilePathParams, getTileIdsForPoint } from './tiles';
import { Graph } from './graph';
import { ReferenceSideOfStreet } from './point_matcher';
import { reverseLineString } from './geom';

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
    binIndex:Map<string, turfHelpers.Feature<turfHelpers.MultiPoint>>;

    intersectionIndex:RBush<turfHelpers.Geometry, turfHelpers.Properties>;
    geometryIndex:RBush<turfHelpers.Geometry, turfHelpers.Properties>;

    additionalTileTypes:TileType[] = [];

    constructor() {

        this.tiles = new Set();
        this.objectIndex = new Map();
        this.featureIndex = new Map();
        this.metadataIndex = new Map();
        this.binIndex = new Map();

        this.intersectionIndex = geojsonRbush(9);
        this.geometryIndex = geojsonRbush(9);
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
                    geometryFeatures.push(geometryFeature);    
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
                    intersectionFeatures.push(intesectionFeature);    
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
            for(var metadata of data) {
                this.metadataIndex.set(metadata.geometryId, metadata.osmMetadata);
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

        var data:turfHelpers.FeatureCollection<turfHelpers.Geometry> 
        
        if(searchType === TileType.GEOMETRY)
            data = this.geometryIndex.search(polygon);
        else if(searchType === TileType.INTERSECTION)
            data = this.intersectionIndex.search(polygon);
        
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
        var data:turfHelpers.FeatureCollection<turfHelpers.Geometry> 
        
        if(searchType === TileType.GEOMETRY)
            data = this.geometryIndex.search(bufferedPoint);
        else if(searchType === TileType.INTERSECTION)
            data = this.intersectionIndex.search(bufferedPoint);

        return data;
    
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

    async geom(referenceId:string, p1:number, p2:number):Promise<turfHelpers.Feature<turfHelpers.LineString|turfHelpers.Point>> {
        
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

            if(p1 == null && p2 == null) {
                return geomFeature;
            }
            else if(p1 && p2 == null) {
                return along(geomFeature, p1, {"units":"meters"});
            } 
            else if(p1 != null && p2 != null) {
                try {
                    return lineSliceAlong(geomFeature, p1, p2, {"units":"meters"});
                }
                catch(e) {
                    //console.log(p1, p2)
                }
                
            }
        }

        // TODO find missing IDs via look up
        return null;
    }
}
