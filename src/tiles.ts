import * as sharedstreetsPbf from 'sharedstreets-pbf';
import {SharedStreetsIntersection, SharedStreetsGeometry } from 'sharedstreets-types';


import * as turfHelpers from '@turf/helpers';
import bbox from "@turf/bbox";
import destination from '@turf/destination';

import { getJson, getPbf } from "./util";

import { lonlatsToCoords } from '../src/index';
const SphericalMercator = require("@mapbox/sphericalmercator");
const sphericalMercator = new SphericalMercator({
    size: 256
});

const DEFAULT_ZLEVEL = 12;

const SHST_ID_API_URL = 'https://api.sharedstreets.io/v0.1.0/id/';

export enum TileType {
    REFERENCE = 'reference',
    INTERSECTION = 'intersection',
    GEOMETRY = 'geometry',
    METADATA = 'metadata'
}

function createIntersectionGeometry(data:SharedStreetsIntersection) {
  
    var point = turfHelpers.point([data.lon, data.lat]);
    return turfHelpers.feature(point.geometry, {id: data.id});

}

function createGeometry(data:SharedStreetsGeometry) {

    var line = turfHelpers.lineString(lonlatsToCoords(data.lonlats));
    return turfHelpers.feature(line.geometry, {id: data.id});
}

export async function getTilesForId(id:string) {
    var url = SHST_ID_API_URL + 'shst:' + id;
    return getJson(url);
}

export function getTileIdsForPolygon(polygon:turfHelpers.Feature<turfHelpers.Polygon>, buffer:number=0):string[] {

    var polyBound = bbox(polygon)

    var nwPoint = destination([polyBound[0],polyBound[1]], buffer, 315, {'units':'meters'});
    var sePoint = destination([polyBound[2],polyBound[3]], buffer, 135, {'units':'meters'});
    let bounds = [nwPoint.geometry.coordinates[0], nwPoint.geometry.coordinates[1], sePoint.geometry.coordinates[0], sePoint.geometry.coordinates[1]];
    
    return getTileIdsForBounds(bounds, false);
  
}

export function getTileIdsForPoint(point:turfHelpers.Feature<turfHelpers.Point>, buffer:number):string[] {
    
    if(buffer > 0) {
        var nwPoint = destination(point, buffer, 315, {'units':'meters'});
        var sePoint = destination(point, buffer, 135, {'units':'meters'});
        let bounds = [nwPoint.geometry.coordinates[0], nwPoint.geometry.coordinates[1], sePoint.geometry.coordinates[0], sePoint.geometry.coordinates[1]];
        return getTileIdsForBounds(bounds, false);
    }
    else{
        let bounds = [point.geometry.coordinates[0], point.geometry.coordinates[1], point.geometry.coordinates[0], point.geometry.coordinates[1]];
        return getTileIdsForBounds(bounds, false);
    }   
}

export function getTileIdsForBounds(bounds:number[], bufferEdge:boolean):string[] {
    
    let tileRange = sphericalMercator.xyz(bounds, DEFAULT_ZLEVEL);
    let tileIds = [];

    // if buffer extend tile range to +/- 1
    let bufferSize = 0;
    if(bufferEdge)
        bufferSize = 1;

    for(var x = tileRange.minX - bufferSize; x <= tileRange.maxX + bufferSize; x++){
        for(var y = tileRange.minY -  bufferSize; y <= tileRange.maxY + bufferSize; y++){
            var tileId = DEFAULT_ZLEVEL + '-' + x + '-' + y;
            tileIds.push(tileId);
        }
    }

    return tileIds;
}

export async function getTile(tilePath:TilePath):Promise<any[]> {

    var arrayBuffer:Uint8Array = await getPbf(tilePath);

    if(arrayBuffer) {
        
        if(tilePath.tileType === TileType.GEOMETRY) {
            var geometries:any[] = sharedstreetsPbf.geometry(arrayBuffer);
            for(var geometry of geometries) {
                geometry['feature'] = createGeometry(geometry);
            }
            return geometries;
        }
        else if(tilePath.tileType === TileType.INTERSECTION) {
            var intersections:any[] = sharedstreetsPbf.intersection(arrayBuffer);
            for(var intersection of intersections) {
                intersection['feature'] = createIntersectionGeometry(intersection);
            }
            return intersections;
        }
        else if(tilePath.tileType === TileType.REFERENCE) {
            var references:any[] = sharedstreetsPbf.reference(arrayBuffer);
            return references;
        }
        else if(tilePath.tileType === TileType.METADATA) {
            var metadata:any[] = sharedstreetsPbf.metadata(arrayBuffer);
            return metadata;
        }
    }
}

export function getIdFromTilePath(tilePath:string):string {
    var pathParts = tilePath.split("/");
    var fileParts = pathParts[pathParts.length-1].split(".");
    var tileId = fileParts[fileParts.length-4];
    return tileId;
}


export function getTypeFromTilePath(tilePath:string):TileType {
    var parts = tilePath.split(".");
    var typeString = parts[parts.length-3].toUpperCase();
    var type:TileType = TileType[typeString]
    return type;
}


export function getSourceFromTilePath(tilePath:string):string {
    var pathParts = tilePath.split('/');
    var tileSource = pathParts[0] + '/' + pathParts[1];
    return tileSource;
}


export function getHierarchyFromPath(tilePath:string):number {
    var parts = tilePath.split(".");
    return parseInt(parts[parts.length-2])
}


abstract class TilePathParams {
    source:string;
    tileHierarchy:number;
    tileType:TileType;
}

export class TilePath extends TilePathParams{
    tileId:string;

    toPathString():string {
        return this.source + '/' +  this.tileId + '.' + this.tileType + '.' + this.tileHierarchy + '.pbf'
    }
    static fromPathString(path:string):TilePath {

        // TODO regex test for path validity

        var tp:TilePath = new TilePath();
        tp.tileId = getIdFromTilePath(path);
        tp.tileType = getTypeFromTilePath(path);
        tp.source = getSourceFromTilePath(path);
        tp.tileHierarchy = getHierarchyFromPath(path);
     
        return tp;
    }
}

export class TilePathGroup extends TilePathParams  {
    tileIds:string[];

    constructor(paths:TilePath[]=null){
        super();
        this.tileIds = [];

        if(paths) {
            for(var path of paths) {
                this.addPath(path);
            }
        }
    }

    *[Symbol.iterator]() {
        for(var tileId of this.tileIds) {
            var tilePath:TilePath = new TilePath();
            tilePath.source = this.source;
            tilePath.tileHierarchy = this.tileHierarchy;
            tilePath.tileType = this.tileType;

            tilePath.tileId = tileId;

            yield tilePath;
        }
    }

    addPath(path:TilePath) {
        if(this.source != undefined && this.source !== path.source)
            throw "Path source does not match group";
        else 
            this.source = path.source;

        if(this.tileType != undefined && this.tileType !== path.tileType)
            throw "Path source does not match group";
        else 
            this.tileType = path.tileType;

        if(this.tileHierarchy != undefined && this.tileHierarchy !== path.tileHierarchy)
            throw "Path source does not match group";
        else 
            this.tileHierarchy = path.tileHierarchy;

        var idSet:Set<string> = new Set(this.tileIds);
        idSet.add(path.tileId);
        this.tileIds = [...idSet.values()];
    }
}
