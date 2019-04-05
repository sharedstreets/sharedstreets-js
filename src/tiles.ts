import * as sharedstreetsPbf from 'sharedstreets-pbf';
import {SharedStreetsIntersection, SharedStreetsGeometry } from 'sharedstreets-types';


import * as turfHelpers from '@turf/helpers';
import bbox from "@turf/bbox";
import destination from '@turf/destination';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';

import { getJson, getPbf } from "./util";

const chalk = require('chalk');

const SphericalMercator = require("@mapbox/sphericalmercator");
const sphericalMercator = new SphericalMercator({
    size: 256
});

const DEFAULT_ZLEVEL = 12;

const SHST_ID_API_URL = 'https://api.sharedstreets.io/v0.1.0/id/';
const SHST_TILE_URL = 'https://tiles.sharedstreets.io/';

const USE_LOCAL_CACHE = true;
const SHST_TILE_CACHE_DIR = './shst/cache/tiles/';

export enum TileType {
    REFERENCE = 'reference',
    INTERSECTION = 'intersection',
    GEOMETRY = 'geometry',
    METADATA = 'metadata',
    EVENTS = 'events'
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

    // TODO use generator/yield pattern + protobuf decodeDelimited

    var arrayBuffer:Uint8Array;
    if(USE_LOCAL_CACHE && existsSync(SHST_TILE_CACHE_DIR + tilePath.toPathString())) {
        arrayBuffer = new Uint8Array(readFileSync(SHST_TILE_CACHE_DIR + tilePath.toPathString()));
        console.log(chalk.keyword('lightgreen')("     reading from cached: " + SHST_TILE_CACHE_DIR + tilePath.toPathString()));
    }
    else {
        arrayBuffer = await getPbf(SHST_TILE_URL + tilePath.toPathString());

        if(USE_LOCAL_CACHE) {
            mkdirSync(SHST_TILE_CACHE_DIR + tilePath.source, { recursive: true });
            writeFileSync(SHST_TILE_CACHE_DIR + tilePath.toPathString(), arrayBuffer);
            console.log(chalk.keyword('lightgreen')("     writing to cache: " + SHST_TILE_CACHE_DIR + tilePath.toPathString()));   
        }
    }

    if(arrayBuffer) {
        
        if(tilePath.tileType === TileType.GEOMETRY) {
            var geometries:any[] = sharedstreetsPbf.geometry(arrayBuffer);
            return geometries;
        }
        else if(tilePath.tileType === TileType.INTERSECTION) {
            var intersections:any[] = sharedstreetsPbf.intersection(arrayBuffer);
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


export class TilePathParams {
    source:string;
    tileHierarchy:number;
    constructor(params:TilePathParams=null) {
        if(params) 
            this.setParams(params);
    }

    setParams(params:TilePathParams) {
        this.source = params.source;
        this.tileHierarchy = params.tileHierarchy;
    }   
}

export class TilePath extends TilePathParams{
    tileId:string;
    tileType:TileType;


    constructor(path:string=null) {
        super();

        if(path) {
            this.tileId = getIdFromTilePath(path);
            this.tileType = getTypeFromTilePath(path);
            this.source = getSourceFromTilePath(path);
            this.tileHierarchy = getHierarchyFromPath(path);
        }
    }

    toPathString():string {
        return this.source + '/' +  this.tileId + '.' + this.tileType + '.' + this.tileHierarchy + '.pbf'
    }
}

export class TilePathGroup extends TilePathParams  {
    tileIds:string[];
    tileTypes:TileType[];

    constructor(paths:TilePath[]=null){
        super();
        this.tileIds = [];
        this.tileTypes = [];

        if(paths) {
            for(var path of paths) {
                this.addPath(path);
            }
        }
    }

    *[Symbol.iterator]() {

        this.tileTypes.sort();
        this.tileIds.sort();

        for(var tileType of this.tileTypes) { 
            for(var tileId of this.tileIds) {
                var tilePath:TilePath = new TilePath();
                tilePath.setParams(this);
                tilePath.tileId = tileId;
                tilePath.tileType = tileType;
    
                yield tilePath;
            }
        }
    }

    addType(tileType:TileType) {
        var typeSet:Set<TileType> = new Set(this.tileTypes);
        typeSet.add(tileType);
        this.tileTypes = [...typeSet.values()];
    }

    addTileId(tileId:string) {
        var idSet:Set<string> = new Set(this.tileIds);
        idSet.add(tileId);
        this.tileIds = [...idSet.values()];
    }

    addPath(path:TilePath) {
        if(this.source != undefined && this.source !== path.source)
            throw "Path source does not match group";
        else 
            this.source = path.source;

        if(this.tileHierarchy != undefined && this.tileHierarchy !== path.tileHierarchy)
            throw "Path source does not match group";
        else 
            this.tileHierarchy = path.tileHierarchy;

        this.addType(path.tileType);
        this.addTileId(path.tileId);
    }

    static fromPolygon(polygon:turfHelpers.Feature<turfHelpers.Polygon>, buffer:number, params:TilePathParams):TilePathGroup {

        var tilePathGroup = new TilePathGroup();
        tilePathGroup.setParams(params);
        tilePathGroup.tileIds = getTileIdsForPolygon(polygon);

        return tilePathGroup;
    }

    static fromPoint(point:turfHelpers.Feature<turfHelpers.Point>, buffer:number, params:TilePathParams):TilePathGroup {

        var tilePathGroup = new TilePathGroup();
        tilePathGroup.setParams(params);
        tilePathGroup.tileIds = getTileIdsForPoint(point, buffer);

        return tilePathGroup;
    }
}
