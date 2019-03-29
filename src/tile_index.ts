
//import redis = require('redis');

//import { SharedStreetsMetadata, SharedStreetsIntersection, SharedStreetsGeometry, SharedStreetsReference, RoadClass  } from 'sharedstreets-types';

import * as turfHelpers from '@turf/helpers';
import buffer from '@turf/buffer';
import along from '@turf/along';

import envelope from '@turf/envelope';
import lineSliceAlong from '@turf/line-slice-along';

import geojsonRbush, { RBush } from 'geojson-rbush';
import { TilePath, getTile, TileType, TilePathGroup, getTileIdsForPolygon, TilePathParams, getTileIdsForPoint } from './tiles';
import { Geometries } from '@turf/buffer/node_modules/@turf/helpers';
import { extend } from 'benchmark';
import { SharedStreetsIntersection, SharedStreetsGeometry, SharedStreetsReference } from 'sharedstreets-types';

import { lonlatsToCoords } from '../src/index';

import { PathSearch } from './routing';
const jkstra = require('jkstra');

const SHST_TILE_URL = 'https://tiles.sharedstreets.io/';
const SHST_TILE_CACHE_DIR = './shst/cache/tiles/';
const SHST_GRAPH_CACHE_DIR = './shst/cache/graphs/';


// maintains unified spaital and id indexes for tiled data

function createIntersectionGeometry(data:SharedStreetsIntersection) {
  
    var point = turfHelpers.point([data.lon, data.lat]);
    return turfHelpers.feature(point.geometry, {id: data.id});

}

function createGeometry(data:SharedStreetsGeometry) {

    var line = turfHelpers.lineString(lonlatsToCoords(data.lonlats));
    return turfHelpers.feature(line.geometry, {id: data.id});
}


export class TileIndex {

    tiles:Set<string>;
    objectIndex:Map<string, {}>;
    featureIndex:Map<string, turfHelpers.Feature<turfHelpers.Geometry>>;
    metadataIndex:Map<string, {}>;

    jkstraGraph;
    graphVertices:{};  
    nextVertexId:number;

    intersectionIndex:RBush<turfHelpers.Geometry, turfHelpers.Properties>;
    geometryIndex:RBush<turfHelpers.Geometry, turfHelpers.Properties>;

    constructor() {

        this.jkstraGraph = new jkstra.Graph();
        this.graphVertices = {};  
        this.nextVertexId = 1;

        this.tiles = new Set();
        this.objectIndex = new Map();
        this.featureIndex = new Map();
        this.intersectionIndex = geojsonRbush(9);
        this.geometryIndex = geojsonRbush(9);
    }


    addGraphEdge(reference) {

        let fromIntersection = this.addGraphVertex(reference.locationReferences[0]);
        let toIntersection = this.addGraphVertex(reference.locationReferences[reference.locationReferences.length-1]);
        let segementLength = 0;

        for(var i in reference.locationReferences) {
            if(reference.locationReferences[i].distanceToNextRef)
                segementLength = segementLength + reference.locationReferences[i].distanceToNextRef;
        }

        var startRef =reference.locationReferences[0];
        var startPoint = [startRef.lon, startRef.lat];

        this.jkstraGraph.addEdge(fromIntersection, toIntersection, {id: reference.id, length: segementLength, start: startPoint}); 

    }

    addGraphVertex(locationRef) {

        var id = locationRef.intersectionId;

        if(!this.graphVertices[id])
            this.graphVertices[id] = this.jkstraGraph.addVertex(this.nextVertexId++);
        

        return this.graphVertices[id];

    }

    getGraphVertex(id) {

        return this.graphVertices[id];

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
                this.addGraphEdge(reference);
            }
        }
        else if(tilePath.tileType === TileType.METADATA) {
            for(var metadata of data) {
                this.metadataIndex.set(metadata.geometryId, metadata.osmMetadata);
            } 
        }

        this.tiles.add(tilePath.toPathString());
    }

    async intersects(polygon:turfHelpers.Feature<turfHelpers.Polygon>, searchType:TileType, params:TilePathParams, additionalTypes:TileType[]=null):Promise<turfHelpers.FeatureCollection<turfHelpers.Geometry>> {

        var tilePaths = TilePathGroup.fromPolygon(polygon, params);

        if(searchType === TileType.GEOMETRY)
            tilePaths.addType(TileType.GEOMETRY);
        else if(searchType === TileType.INTERSECTION)
            tilePaths.addType(TileType.INTERSECTION);
        else 
            throw "invalid search type must be GEOMETRY or INTERSECTION";

        if(additionalTypes) {
            for(var type of additionalTypes) {
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

    async nearby(point:turfHelpers.Feature<turfHelpers.Point>, searchType:TileType, searchRadius:number, params:TilePathParams, additionalTypes:TileType[]=null) {

        var tilePaths = TilePathGroup.fromPoint(point, searchRadius * 2, params);

        if(searchType === TileType.GEOMETRY)
            tilePaths.addType(TileType.GEOMETRY);
        else if(searchType === TileType.INTERSECTION)
            tilePaths.addType(TileType.INTERSECTION);
        else 
            throw "invalid search type must be GEOMETRY or INTERSECTION"

        if(additionalTypes) {
            for(var type of additionalTypes) {
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

    async geom(referenceId:string, p1:number, p2:number):Promise<turfHelpers.Feature<turfHelpers.Geometry>> {
    
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
                catch(e){
                    console.log(e);
                }
            }
        }

        // TODO find missing IDs via look up
        return null;
    }

    route(startRef:SharedStreetsReference, startPosition:number, endRef:SharedStreetsReference, endPosition:number, endCoord:turfHelpers.Coord, pathLength:number, lengthVariance:number) {

            var startVertexId = this.getGraphVertex(startRef.locationReferences[0].intersectionId);
            var endVertexId = this.getGraphVertex(endRef.locationReferences[endRef.locationReferences.length-1].intersectionId);

            var pathSearch = new PathSearch(this.jkstraGraph);

            var results = pathSearch.findPath(startVertexId, endVertexId, endCoord, pathLength * (1-lengthVariance), pathLength * (1+lengthVariance), { edgeCost: (e) => { 
                        // adjust edge cost for partial edges
                        if(e.data.id == startRef.id)
                            return (e.data.length / 100) - startPosition; 
                        else if(e.data.id == endRef.id)
                            return endPosition;
                        else 
                            return (e.data.length / 100); 
                    },
                    edgeFilter: (e) => {
                        // only consider start/end edge for start/end vertices
                        if(e.from.data == startVertexId.data) {
                            if(e.data.id == startRef.id)
                                return true;
                            else
                                return false;
                        }
                        else if(e.to.data == endVertexId.data) {
                            if(e.data.id == endRef.id)
                                return true;
                            else
                                return false;
                        }   
                        else 
                            return true;
                    }});
            
            var bestPath = [];
            var bestVariarence = -1;
            if(results) {
                for(var result of results) {
                    var currentVarienace = Math.abs((pathLength / result.length) -1); 
                    if(bestVariarence < 0 || currentVarienace < bestVariarence) {
                        bestVariarence = currentVarienace;
                        bestPath = result.path;
                    }
                }
            }
            
            return bestPath;
    }
}

// export class LocalCache {

//     MAX_TILES:number = 100;

//     localTileCache:LRUMap<string, any>;
//     intersectionIndex:Map<string, RBush<Geometry, Properties>>;
//     geometryIndex:Map<string, RBush<Geometry, Properties>>;
//     idIndex;
//     idTileIndex;
//     jkstraGraph;
//     indexedTiles;
//     graphVertices;
//     nextVertexId;
//     streetNameTileIndex;
//     osmMetadataIndex;

//     LOAD_TIMEOUT = 10 * 1000;

//     s3Bucket:string = 'sharedstreets-tiles';

//     constructor() {
//         this.localTileCache = new LRUMap<string, any>(this.MAX_TILES);

//         this.idIndex = {};
//         this.idTileIndex = {};

//         this.jkstraGraph = new jkstra.Graph();
//         this.geometryIndex = new Map();// geojsonRbush(9);
//         this.intersectionIndex = new Map();// geojsonRbush(9);
//         this.graphVertices = {};
//         this.streetNameTileIndex = {};
//         this.osmMetadataIndex = {};
//         this.indexedTiles = {};
//         this.nextVertexId = 1;

//         this.localTileCache.shift = function() {

//             var sw = new Stopwatch();

//             let entry = LRUMap.prototype.shift.call(this);

//             this.idIndex = {};

//             // reset indexes as items are shifted out of tile cache
//             this.jkstraGraph = new jkstra.Graph();
//             this.geometryIndex =new Map();
//             this.intersectionIndex =new Map();
//             this.graphVertices = {};
//             this.indexedTiles = {};
//             this.streetNameTileIndex = {};
//             this.streetNameIndexLookup = {};
//             this.osmMetadataIndex = {};
//             this.nextVertexId = 1;

//             sw.log("evicting " + entry[0]);

//             return entry;
//         }
//     }

//     getGeomIndex(tileSource:string, level:number):RBush<Geometry, Properties> {
//         var indexKey = tileSource + '.' + level;
//         if(!this.geometryIndex.has(indexKey)){ 
//             var index:RBush<Geometry, Properties> = geojsonRbush<Geometry, Properties>(9);
//             this.geometryIndex.set(indexKey, index);
//         }
        
//         return this.geometryIndex.get(indexKey);
//     }

//     getIntersectionIndex(tileSource:string, level:number):RBush<Geometry, Properties> {
//         var indexKey = tileSource + '.' + level;
//         if(!this.intersectionIndex.has(indexKey)){ 
//             var index:RBush<Geometry, Properties> = geojsonRbush<Geometry, Properties>(9);
//             this.intersectionIndex.set(indexKey, index);
//         }
            
//         return this.intersectionIndex.get(indexKey);
        
//     }

//     buildTileKey(tileSource:string, tileBuild:string, tileKey:string, tileType:string, tileHierarchy:number) {
//         return tileSource + '/' + tileBuild + '/' + tileKey + '.' + tileType + '.' + tileHierarchy + '.pbf';
//     }

//     isCached(tileKey:string):Boolean {
//         if(this.localTileCache.has(tileKey))
//             return true;
//         else   
//             return false;
//     }

//     isIndexed(tileKey:string):Boolean {
//         if(this.indexedTiles[tileKey])
//             return true;
//         else   
//             return false;
//     }


//     async cacheTile(tileSource:string, tileBuild:string, tileKey:string, tileType:string, tileHierarchy:number):Promise<boolean> {

//         var tilePath = this.buildTileKey(tileSource, tileBuild, tileKey, tileType, tileHierarchy)
//         return this.cacheTileByPath(tilePath);

//     }

//     async cacheTileByPath(tilePath:string):Promise<boolean> {

//         var tileType:string = getTileTypeFromPath(tilePath);

//         var sw = new Stopwatch();

//         if(!this.isCached(tilePath)) {
//             var data:any[] = await getTile(tilePath, tileType, true);
//             this.localTileCache.set(tilePath, data);
//             sw.log('cached: ' + tilePath);
//         }
//         else {
//             // touch cache to update LRU status
//             this.localTileCache.get(tilePath);
//         }
        
//         // tile data may have been evicted from index
//         if(!this.isIndexed(tilePath)) {

//             var itemCount = 0;

//             if(tileType === 'geometry') {            
//                 var geometryFeatures = [];
                
//                 for(var geometry of this.localTileCache.get(tilePath)) {
//                     this.idIndex[geometry.id] = geometry;   
//                     this.idTileIndex[geometry.id] = tilePath;
//                     geometryFeatures.push(geometry['feature']);  
                     
//                     itemCount++;   
//                 }
//                 var source = getTileSourceFromPath(tilePath); 
//                 var hierarchy = getHierarchyFromPath(tilePath); 
//                 this.getGeomIndex(source, hierarchy).load(geometryFeatures);
//                 this.indexedTiles[tilePath] = true;
                
//             }
//             else if(tileType === 'intersection') {
//                 var intersectionFeatures = [];
//                 for(var intersection of this.localTileCache.get(tilePath)) {
//                     this.idIndex[intersection.id] = intersection;  
//                     this.idTileIndex[intersection.id] = tilePath;
//                     intersectionFeatures.push(intersection['feature']);
//                     itemCount++;
//                 }
//                 var source = getTileSourceFromPath(tilePath); 
//                 var hierarchy = getHierarchyFromPath(tilePath); 
//                 this.getIntersectionIndex(source, hierarchy).load(intersectionFeatures);
//                 this.indexedTiles[tilePath] = true;
//             }
//             else if(tileType === 'reference') {
//                 for(var reference of this.localTileCache.get(tilePath)) {
//                     this.idIndex[reference.id] = reference; 
//                     this.idTileIndex[reference.id] = tilePath;
//                     this.addGraphEdge(reference);

//                     itemCount++;   
//                 }
//                 this.indexedTiles[tilePath] = true;
//             }

//             else if(tileType === 'metadata') {
//                 var streetnameCollectionBuilder = new StreetnameCollectionBuilder();

//                 for(var metadata of this.localTileCache.get(tilePath)) {

//                     if(metadata.osmMetadata.name != undefined) {
//                         var streetname = new Streetname(metadata.osmMetadata.name);
//                         streetname.add(metadata.geometryId);
//                         streetnameCollectionBuilder.add(streetname); 
//                     }
//                     this.osmMetadataIndex[metadata.geometryId] = metadata.osmMetadata;
//                 }
                
//                 this.streetNameTileIndex[tilePath] = new StreetnameIndex(streetnameCollectionBuilder);
//                 this.indexedTiles[tilePath] = true;  
//             }

//             sw.log('indexed: ' +  tilePath + ' ' + itemCount);

//             return true;
//         }
//         else
//             return false;
//     }

//     addGraphEdge(reference) {

//         let fromIntersection = this.addGraphVertex(reference.locationReferences[0]);
//         let toIntersection = this.addGraphVertex(reference.locationReferences[reference.locationReferences.length-1]);
//         let segementLength = 0;

//         for(var i in reference.locationReferences) {
//             if(reference.locationReferences[i].distanceToNextRef)
//                 segementLength = segementLength + reference.locationReferences[i].distanceToNextRef;
//         }

//         var startRef =reference.locationReferences[0];
//         var startPoint = [startRef.lon, startRef.lat];

//         this.jkstraGraph.addEdge(fromIntersection, toIntersection, {id: reference.id, length: segementLength, start: startPoint}); 

//     }

//     addGraphVertex(locationRef) {

//         var id = locationRef.intersectionId;

//         if(!this.graphVertices[id])
//             this.graphVertices[id] = this.jkstraGraph.addVertex(this.nextVertexId++);
        

//         return this.graphVertices[id];

//     }

//     getGraphVertex(id) {

//         return this.graphVertices[id];

//     }

//     // faster buffer operation using bbox
//     envelopeBufferFromPoint(point, radius):Feature<Polygon> {
//         var nwPoint = destination(point, radius, 315, {'units':'meters'});
//         var sePoint = destination(point, radius, 135, {'units':'meters'});
//         return envelope(turfHelpers.featureCollection([nwPoint, sePoint]));
//     }   

//     async streetname(query:string, point:Feature<Point>, includeGeometries:boolean, includeMetadata:boolean, searchRadius:number, tileBuild:string, tileHierarchy:number ):Promise<Array<StreetnameQueryResult>> {

//         var tileIds:string[] = getTileIdsForPoint(point, searchRadius * 2);

//         for(var tileId of tileIds) {
//             await this.cacheTile('osm', tileBuild, tileId, 'geometry', tileHierarchy);
//             await this.cacheTile('osm', tileBuild, tileId, 'reference', tileHierarchy);
//             await this.cacheTile('osm', tileBuild, tileId, 'intersection', tileHierarchy);
//             await this.cacheTile('osm', tileBuild, tileId, 'metadata', tileHierarchy);
//         }

//         var resultSet = new StreetnameQueryResultSet();

//         for(var tileId of tileIds) { 
//             var tilePath = this.buildTileKey('osm', tileBuild, tileId, 'metadata', tileHierarchy);
//             var queryResults = this.streetNameTileIndex[tilePath].query(query, false);

//             var primaryStreetGeomIds = new Set<string>();
//             var intersectionStreetGeomIds = new Map<string, string[]>();

//             if(includeGeometries) {
//                 var newFeatureCollection = {type:"FeatureCollection", features:[]}
//                 for(var result of queryResults.getList(true)) {
//                     var idList:string[] =  Array.from(result.streetname.geometryIds);
//                     for(var geomId of idList) {
        
//                         var fullFeature = this.idIndex[geomId];
//                         var shstGeomWithMetadata = new ExtendableSharedStreetsGeometry(fullFeature.feature);

//                         shstGeomWithMetadata.properties.id = geomId;
//                         primaryStreetGeomIds.add(geomId)
//                         shstGeomWithMetadata.geometry = fullFeature.feature.geometry;

//                         if(includeMetadata) {

//                             shstGeomWithMetadata.properties.roadClass = fullFeature.roadClass;

//                             var metadata = this.osmMetadataIndex[geomId];

//                             var forwardReference = this.idIndex[fullFeature.forwardReferenceId];
//                             var backReference = null;
//                             if(fullFeature.backReferenceId)
//                                 backReference = this.idIndex[fullFeature.backReferenceId];

//                             var fromIntersection = this.idIndex[fullFeature.fromIntersectionId];
//                             var toIntersection = this.idIndex[fullFeature.toIntersectionId];

//                             for(var refId of fromIntersection.inboundReferenceIds) {
//                                 if(!intersectionStreetGeomIds.has(fromIntersection.id))
//                                     intersectionStreetGeomIds.set(fromIntersection.id, [])
//                                 intersectionStreetGeomIds.get(fromIntersection.id).push(this.idIndex[refId].geometryId);
//                             }
//                             for(var refId of fromIntersection.outboundReferenceIds) {
//                                 if(!intersectionStreetGeomIds.has(fromIntersection.id))
//                                     intersectionStreetGeomIds.set(fromIntersection.id, [])
//                                 intersectionStreetGeomIds.get(fromIntersection.id).push(this.idIndex[refId].geometryId);
//                             }

//                             for(var refId of toIntersection.inboundReferenceIds) {
//                                 if(!intersectionStreetGeomIds.has(toIntersection.id))
//                                     intersectionStreetGeomIds.set(toIntersection.id, [])
//                                 intersectionStreetGeomIds.get(toIntersection.id).push(this.idIndex[refId].geometryId);
//                             }
//                             for(var refId of toIntersection.outboundReferenceIds) {
//                                 if(!intersectionStreetGeomIds.has(toIntersection.id))
//                                     intersectionStreetGeomIds.set(toIntersection.id, [])
//                                 intersectionStreetGeomIds.get(toIntersection.id).push(this.idIndex[refId].geometryId);
//                             }

//                             shstGeomWithMetadata.properties.fromIntersection = fromIntersection;
//                             shstGeomWithMetadata.properties.toIntersection = toIntersection;
//                             shstGeomWithMetadata.properties.forwardReference = forwardReference;

//                             if(backReference)
//                                 shstGeomWithMetadata.properties.backReference = backReference;
//                             shstGeomWithMetadata.properties.metadata = metadata;
//                         }

//                         newFeatureCollection.features.push(shstGeomWithMetadata);
//                     }
                    
//                     result.streetname.geometries = newFeatureCollection;

//                     if(true) { // includeCrossStreets
//                         var intersectionStreetnames = new Map<string, Set<string>>()
//                         for(var intersectionId of Array.from(intersectionStreetGeomIds.keys())) {
//                             for(var intersectionGeomId of intersectionStreetGeomIds.get(intersectionId)){
//                                 if(!primaryStreetGeomIds.has(intersectionGeomId)) {

//                                     if(!intersectionStreetnames.has(intersectionId)) {
//                                         intersectionStreetnames.set(intersectionId, new Set<string>());
//                                     }   

//                                     var metadata = this.osmMetadataIndex[intersectionGeomId]; 
//                                     if(metadata.name)
//                                         intersectionStreetnames.get(intersectionId).add(metadata.name);
//                                     else {
//                                         for(var section of metadata.waySections) {
//                                             if(section.name)
//                                                 intersectionStreetnames.get(intersectionId).add(section.name);
//                                         }
//                                     }
//                                 }
//                             }
//                         }

//                         var outputIntersectionIds = {}
                        
//                         for(var intersectionId of Array.from(intersectionStreetnames.keys())) {
//                             outputIntersectionIds[intersectionId] = Array.from(intersectionStreetnames.get(intersectionId));
//                         }

//                         result.streetname['intersectionStreetnames'] = outputIntersectionIds;
//                     }
//                 }
                
//             }

//             resultSet = resultSet.merge(queryResults);
//         }  

//         return resultSet.getList();
//     }

//     async intersection(query1:string, query2:string, point:Feature<Point>, searchRadius:number, query1exact:boolean, query2exact:boolean, tileBuild:string, tileHierarchy:number ):Promise<Array<StreetnameQueryResult>> {

//         var tileIds:string[] = getTileIdsForPoint(point, searchRadius * 2);

//         for(var tileId of tileIds) {
//             await this.cacheTile('osm', tileBuild, tileId, 'geometry', tileHierarchy);
//             await this.cacheTile('osm', tileBuild, tileId, 'metadata', tileHierarchy);
//         }

//         var resultSet1 = new StreetnameQueryResultSet();

//         for(var tileId of tileIds) { 
//             var tilePath = this.buildTileKey('osm', tileBuild, tileId, 'metadata', tileHierarchy);
//             var queryResults = this.streetNameTileIndex[tilePath].query(query1, query1exact);
//             resultSet1 = resultSet1.merge(queryResults);
//         } 

//         var resultSet2 = new StreetnameQueryResultSet();

//         for(var tileId of tileIds) { 
//             var tilePath = this.buildTileKey('osm', tileBuild, tileId, 'metadata', tileHierarchy);
//             var queryResults = this.streetNameTileIndex[tilePath].query(query2, query2exact);
//             resultSet2 = resultSet2.merge(queryResults);
//         }  

//         class TempIntersectionIndex  {

//             intersectionGeomIndex = {};
//             intersectionPointIndex = {};

//             getIntersectionIds() {

//                 return Object.keys(this.intersectionGeomIndex);

//             }

//             containsInetersectionId(intersectionId) {
//                 return this.intersectionGeomIndex[intersectionId] ? true : false;
//             }

//             getGeometryIdsByIntersectionId(intersectionId) {
//                 return this.intersectionGeomIndex[intersectionId];
//             }

//             getPointIdsByIntersectionId(intersectionId) {

//                 return this.intersectionPointIndex[intersectionId];

//             }

//             constructor(idIndex, geometryIds:string[])  {

//                 for(var geometyId of geometryIds) {
//                     var fromIntersectionId = idIndex[geometyId].fromIntersectionId;
//                     var fromPoint = idIndex[geometyId].feature.geometry.coordinates[0];
    
//                     var toIntersectionId = idIndex[geometyId].toIntersectionId;
//                     var toPoint = idIndex[geometyId].feature.geometry.coordinates[idIndex[geometyId].feature.length - 1];
                    
//                     if(!this.intersectionGeomIndex[fromIntersectionId])
//                         this.intersectionGeomIndex[fromIntersectionId] = [];
    
//                     if(!this.intersectionGeomIndex[toIntersectionId])
//                         this.intersectionGeomIndex[toIntersectionId] = [];
                        
//                     this.intersectionGeomIndex[fromIntersectionId].push(geometyId);
//                     this.intersectionGeomIndex[toIntersectionId].push(geometyId);

//                     this.intersectionPointIndex[fromIntersectionId] = fromPoint;
//                     this.intersectionPointIndex[toIntersectionId] = toPoint;
//                 }
//             }
//         }   

//         const buildIntersectionIndex = (geometryIds:string[]):{} => {
            
//             var intersectionIndex = {}

            

//             return intersectionIndex;
//         };

//         var intersectionIndex1 = new TempIntersectionIndex(this.idIndex, Object.keys(resultSet1.getQueryGeometryIdIndex()));
//         var intersectionIndex2 = new TempIntersectionIndex(this.idIndex, Object.keys(resultSet2.getQueryGeometryIdIndex()));

//         // find intersections
//         var matchedIntersections = []
//         for(var intersectionId of intersectionIndex1.getIntersectionIds()) {
//             if(intersectionIndex2.containsInetersectionId(intersectionId)) {

//                 if(!matchedIntersections[intersectionId])
//                     matchedIntersections[intersectionId] = []; 

//                 intersectionIndex1.getGeometryIdsByIntersectionId(intersectionId).forEach((geometryId) => {

//                     var alreadyIndexed = false;
//                     for(var street of matchedIntersections[intersectionId]){
//                         if(street.streetname.geometryIds.has(geometryId))
//                             alreadyIndexed = true;
//                     }
//                     if(!alreadyIndexed)
//                         matchedIntersections[intersectionId].push(resultSet1.getStreetByGeometryId(geometryId))    
//                 });

//                 intersectionIndex2.getGeometryIdsByIntersectionId(intersectionId).forEach((geometryId) => {
//                     var alreadyIndexed = false;
//                     for(var street of matchedIntersections[intersectionId]){
//                         if(street.streetname.geometryIds.has(geometryId))
//                             alreadyIndexed = true;
//                     }
//                     if(!alreadyIndexed)
//                         matchedIntersections[intersectionId].push(resultSet2.getStreetByGeometryId(geometryId))      
//                 });
//             }
                
//         }

//         var results = []

//         for(var intersectionId of Object.keys(matchedIntersections)) {
//             var intersection = {intersectionId: intersectionId, score: 0, point:intersectionIndex1.getPointIdsByIntersectionId(intersectionId), streets: []};
//             for(var street of matchedIntersections[intersectionId]) {
//                 intersection.score += street.score;
//                 intersection.streets.push(street.getResultObject(false));
//             }
            
//             if(intersection.streets.length > 1)
//                 results.push(intersection);
//         }

//         return results;
//     }

//     async geom(referenceId:string, p1:number, p2:number):Promise<Feature> {
    
//         if(this.idIndex[referenceId]) {
//             var ref:SharedStreetsReference = this.idIndex[referenceId];
//             var geom:SharedStreetsGeometry = JSON.parse(JSON.stringify(this.idIndex[ref.geometryId]));

//             if(p1 < 0)
//                 p1 = 0;
//             if(p2 < 0)
//                 p2 = 0;

//             if(geom.backReferenceId && geom.backReferenceId === referenceId) {                
//                 geom['feature'].geometry.coordinates = geom['feature'].geometry.coordinates.reverse()
//             }

//             if(p1 == null && p2 == null) {
//                 return geom['feature'];
//             }
//             else if(p1 && p2 == null) {
//                 return along(geom['feature'], p1, {"units":"meters"});
//             } 
//             else if(p1 != null && p2 != null) {
//                 try {
//                     return lineSliceAlong(geom['feature'], p1, p2, {"units":"meters"});
//                 }
//                 catch(e){
//                     console.log(e);
//                 }
//             }
//         }

//         return null;
//     }

//     async nearby(type, point:Feature<Point>, searchRadius:number, tileSource:string, tileBuild:string, tileHierarchy:number) {

//         var tileIds:string[] = getTileIdsForPoint(point, searchRadius * 2);

//         for(var tileId of tileIds) {
//             await this.cacheTile(tileSource, tileBuild, tileId, 'geometry', tileHierarchy);
//             await this.cacheTile(tileSource, tileBuild, tileId, 'reference', tileHierarchy);
//         }

//         var results = [];
        
//         var features:FeatureCollection;
//         var bufferedPoint:Feature<Polygon> = buffer(point, searchRadius, {'units':'meters'});

//         //var bufferedPoint:Feature<Polygon> = this.envelopeBufferFromPoint(point, searchRadius);
//         features = this.getGeomIndex(tileSource + '/' + tileBuild,  tileHierarchy).search(bufferedPoint);

//         return features;
    
//     }

//     async within(type, polygon:Feature<Polygon>, includeMetadata:boolean, tileSource:string, tileBuild:string, tileHierarchy:number):Promise<ExtendableSharedStreetsGeometry[]> {

//         var tileIds:string[] = getTileIdsForPolygon(polygon, 2500);

//         for(var tileId of tileIds) {
//             await this.cacheTile(tileSource, tileBuild, tileId, 'geometry', tileHierarchy);
//             if(includeMetadata) {
//                 await this.cacheTile(tileSource, tileBuild, tileId, 'reference', tileHierarchy);
//                 await this.cacheTile(tileSource, tileBuild, tileId, 'intersection', tileHierarchy);
//                 await this.cacheTile(tileSource, tileBuild, tileId, 'metadata', tileHierarchy);
//             }
//         }

//         //var bufferedPoint:Feature<Polygon> = this.envelopeBufferFromPoint(point, searchRadius);
//         var originalFeatureCollection = this.getGeomIndex(tileSource + '/' + tileBuild, tileHierarchy).search(polygon);
//         var newFeatureCollection:ExtendableSharedStreetsGeometry[] = [];

//         for(var feature of originalFeatureCollection.features) {
            
//             var featureCopy = feature; 
//             var fullFeature = this.idIndex[feature.properties.id];
//             var shstGeomWithMetadata = new ExtendableSharedStreetsGeometry(fullFeature);

//             shstGeomWithMetadata.properties.id = feature.properties.id;
//             shstGeomWithMetadata.geometry = feature.geometry;

//             if(includeMetadata) {

//                 shstGeomWithMetadata.properties.roadClass = fullFeature.roadClass;

//                 var metadata = this.osmMetadataIndex[feature.properties.id];

//                 var forwardReference = this.idIndex[fullFeature.forwardReferenceId];
//                 var backReference = null;
//                 if(fullFeature.backReferenceId)
//                     backReference = this.idIndex[fullFeature.backReferenceId];

//                 var fromIntersection = this.idIndex[fullFeature.fromIntersectionId];
//                 var toIntersection = this.idIndex[fullFeature.toIntersectionId];

//                 shstGeomWithMetadata.properties.fromIntersection = fromIntersection;
//                 shstGeomWithMetadata.properties.toIntersection = toIntersection;
//                 shstGeomWithMetadata.properties.forwardReference = forwardReference;

//                 if(backReference)
//                     shstGeomWithMetadata.properties.backReference = backReference;
//                 shstGeomWithMetadata.properties.metadata = metadata;
//             }
            
//             newFeatureCollection.push(shstGeomWithMetadata);
//         }
    
       
//         return newFeatureCollection;
    
//     }

//     async byIds(type, ids:string[], point:Feature<Point>, searchRadius, tileSource:string, tileBuild:string,  tileHierarchy:number) {

//         var tileIds:string[] = getTileIdsForPoint(point, searchRadius * 2);

//         for(var tileId of tileIds) {
//             await this.cacheTile(tileSource, tileBuild, tileId, 'geometry', tileHierarchy);
//         }

//         //var bufferedPoint:Feature<Polygon> = this.envelopeBufferFromPoint(point, searchRadius);
        
//         var features = [];

//         for(var id of ids) {
//             if(this.idIndex[id])
//                 features.push(this.idIndex[id].feature);   
//         }
        
//         return features;
    
//     }

//     async intersectionById(id, ) {
        
//         // check if metadata exists -- ship
//         if(this.idIndex[id])
//             return this.idIndex[id];

//         // TODO lazyload intersection data using aerospike

//         // id not found
//         return null;
         
//     }
//     async id(id) {
//         var parts = id.split(':')
//         if(parts.length == 1) {
//             var data = await getAerospikeId('shst/' + id);
//             return data;
//         }
//         else if(parts.length == 2 && parts[0] === 'shst') {
//             var data = await getAerospikeId('shst/' + parts[1]);
//             return data;
//         }
//         else if(parts.length == 3 && parts[0] === 'osm' && parts[1] === 'node') {
//             var data = await getAerospikeId('osm/node/' + parts[2]);
//             return data;
//         }
//         else if(parts.length == 3 && parts[0] === 'osm' && parts[1] === 'way') {
//             var data = await getAerospikeId('osm/way/' + parts[2]);
//             return data;
//         }
        
//         // // check if metadata exists -- ship
//         // if(this.osmMetadataIndex[id])
//         //     return this.osmMetadataIndex[id];    
    
//         // // lazyload metadata by ID
//         // if(this.idTileIndex[id]) {
//         //     var tilePath:string = this.idTileIndex[id];
//         //     var tileType:string = getTileTypeFromPath(tilePath);
//         //     var metadataTilePath = null;

//         //     if(tileType === 'reference')
//         //         metadataTilePath = tilePath.replace('reference', 'metadata');
//         //     else if(tileType === 'intersection')
//         //         metadataTilePath = tilePath.replace('intersection', 'metadata');
//         //     else if(tileType === 'geometry')
//         //         metadataTilePath = tilePath.replace('geometry', 'metadata');
            
//         //     if(metadataTilePath) {
//         //         await this.cacheTileByPath(metadataTilePath);
//         //         return this.osmMetadataIndex[id];
//         //     }
//         // }

//         // // id not found

//     }

//     async metadataById(id) {
        
//         // check if metadata exists -- ship
//         if(this.osmMetadataIndex[id])
//             return this.osmMetadataIndex[id];

//         // lazyload metadata by ID
//         if(this.idTileIndex[id]) {
//             var tilePath:string = this.idTileIndex[id];
//             var tileType:string = getTileTypeFromPath(tilePath);
//             var metadataTilePath = null;

//             if(tileType === 'reference')
//                 metadataTilePath = tilePath.replace('reference', 'metadata');
//             else if(tileType === 'intersection')
//                 metadataTilePath = tilePath.replace('intersection', 'metadata');
//             else if(tileType === 'geometry')
//                 metadataTilePath = tilePath.replace('geometry', 'metadata');
            
//             if(metadataTilePath) {
//                 await this.cacheTileByPath(metadataTilePath);
//                 return this.osmMetadataIndex[id];
//             }
//         }
        
//         // TODO: get tile for id from aerospike

//         // id not found
//         return null;
         
//     }

//     route(startRef:SharedStreetsReference, startPosition:number, endRef:SharedStreetsReference, endPosition:number, endCoord:Coord, pathLength:number, lengthVariance:number) {

//         var startVertexId = this.getGraphVertex(startRef.locationReferences[0].intersectionId);
//         var endVertexId = this.getGraphVertex(endRef.locationReferences[endRef.locationReferences.length-1].intersectionId);

//         var pathSearch = new PathSearch(this.jkstraGraph);

//         var results = pathSearch.findPath(startVertexId, endVertexId, endCoord, pathLength * (1-lengthVariance), pathLength * (1+lengthVariance), { edgeCost: (e) => { 
//                     // adjust edge cost for partial edges
//                     if(e.data.id == startRef.id)
//                         return (e.data.length / 100) - startPosition; 
//                     else if(e.data.id == endRef.id)
//                         return endPosition;
//                     else 
//                         return (e.data.length / 100); 
//                 },
//                 edgeFilter: (e) => {
//                     // only consider start/end edge for start/end vertices
//                     if(e.from.data == startVertexId.data) {
//                         if(e.data.id == startRef.id)
//                             return true;
//                         else
//                             return false;
//                     }
//                     else if(e.to.data == endVertexId.data) {
//                         if(e.data.id == endRef.id)
//                             return true;
//                         else
//                             return false;
//                     }   
//                     else 
//                         return true;
//                 }});
        
//         var bestPath = [];
//         var bestVariarence = -1;
//         if(results) {
//             for(var result of results) {
//                 var currentVarienace = Math.abs((pathLength / result.length) -1); 
//                 if(bestVariarence < 0 || currentVarienace < bestVariarence) {
//                     bestVariarence = currentVarienace;
//                     bestPath = result.path;
//                 }
//             }
//         }
        
//         return bestPath;

//     }
// }

    