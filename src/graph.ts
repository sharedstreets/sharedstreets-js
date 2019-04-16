import * as turfHelpers from '@turf/helpers';
import { TilePathParams, TilePathGroup, TileType } from './tiles';
import { existsSync, mkdirSync, open, createWriteStream, rmdirSync } from 'fs';
import { LevelUp } from 'levelup';
import { TileIndex } from './tile_index';
import { lonlatsToCoords } from './index';
import { SharedStreetsGeometry, SharedStreetsReference } from 'sharedstreets-types';
import { execSync } from 'child_process';
import { PointMatcher, ReferenceSideOfStreet, PointCandidate, ReferenceDirection } from './point_matcher';
import { RoadClass } from 'sharedstreets-pbf/proto/sharedstreets';
import length from '@turf/length';
import distance from '@turf/distance';
import envelope from '@turf/envelope';

const { exec } = require('child_process');
const OSRM = require("osrm");
const xml = require('xml');
const stream = require('stream');
const levelup = require('levelup');
const leveldown = require('leveldown');
const chalk = require('chalk');
const path = require('path');
const util = require('util');
import * as fs from "fs";
import Match from './commands/match';
import { rmse } from './util';

const uuidHash = require('uuid-by-string');

const MIN_CONFIDENCE = 0.5;
const OPTIMIZE_GRAPH = true;
const USE_LOCAL_CACHE = true;
const SHST_GRAPH_CACHE_DIR = 'shst/cache/graphs/';

export enum MatchType {
    DIRECT = 'direct',
    HMM = 'hmm'
}

export enum GraphMode {
    CAR = 'car',
    BIKE = 'bike',
    PEDESTRIAN = 'ped'
}

// interface typecheck for SharedStreetsGeometry
function geomInstance(object: any): object is SharedStreetsGeometry {
    return 'forwardReferenceId' in object;
}

function getReferenceLength(ref:SharedStreetsReference) {
    var length = 0;
    for(var lr of ref.locationReferences) {
        if(lr.distanceToNextRef)
            length += lr.distanceToNextRef;
    }
    return length / 100;
}

class GraphNode {
    nodeId:number;
    shstIntersectionId:string;
}

class GraphEdge {
    edgeId:number;
    shstGeometryId:string;
}

class GraphNodeEdgeRelations {
    nodeId:number;
    edgeIds:number[];
}

export class LevelDB {

    db;

    constructor(directory) {
        this.db = levelup(leveldown(directory));
    }

    async get(key:string):Promise<any> {
        try {
            var data = await this.db.get(key);
            return data.toString();
        }
        catch(error) {
            return null;
        }
    }

    async put(key:string, data:any) {
        return await this.db.put(key, data);
    }

    async has(key:string):Promise<boolean> {
        try {
            await this.db.get(key);
            return true;
        }
        catch(error) {
            return null;
        }
    }
}

function streamPromise(stream) {
    return new Promise((resolve, reject) => {
        stream.on('end', () => {
            resolve('end');
        });
        stream.on('error', (error) => {
            reject(error);
        });
    });
}

export class Graph {

    id:string;
    db:LevelDB;
    osrm;
    pointMatcher:PointMatcher; // need a local copy for point lookup
    tilePathGroup:TilePathGroup;
    tileIndex:TileIndex;
    graphMode:GraphMode

    constructor(extent:turfHelpers.Feature<turfHelpers.Polygon>, params:TilePathParams, existingTileIndex:TileIndex=null, graphMode:GraphMode=GraphMode.CAR) {

        this.tilePathGroup = TilePathGroup.fromPolygon(extent, 1000, params);
        this.tilePathGroup.addType(TileType.GEOMETRY);
        this.tilePathGroup.addType(TileType.REFERENCE);

        this.graphMode = graphMode;

        var paths:string[] = [];
        for(var path of this.tilePathGroup) {
            paths.push(path.toPathString());
        }

        if(existingTileIndex) {
            this.tileIndex = existingTileIndex;
        }
        else {
            this.tileIndex = new TileIndex();
        }

        this.pointMatcher = new PointMatcher(extent, params, this.tileIndex);

        // create id from tile path hash  
        this.id = uuidHash(this.graphMode + ' ' + paths.join(" "));
    }

    async createGraphXml() {

        // build xml representation of graph + leveldb id map
        var graphPath = path.join(SHST_GRAPH_CACHE_DIR, this.id);

        var nextNodeId:number = 1;
        var nextEdgeId:number = 1;
        var xmlPath = path.join(graphPath, '/graph.xml');

        // create xml stream
        const pipeline = util.promisify(stream.pipeline);
        var xmlStreamWriter = createWriteStream(xmlPath);

        var osmRootElem = xml.element({ _attr: { version: '0.6', generator: 'shst cli v1.0'} });
       
        var xmlStream = xml({ osm: osmRootElem }, { stream: true });
        xmlStream.on('data', function (chunk) {xmlStreamWriter.write(chunk)});
    
        const writeNode = async (lon:number, lat:number, shstIntersectionId:string=null):Promise<number> => {
            var nodeId:number;

            // check if intersection node already written
            if(shstIntersectionId && await this.db.has(shstIntersectionId)) {
                var node:GraphNode =  JSON.parse(await this.db.get(shstIntersectionId));
                nodeId = node.nodeId;
            }
            else {

                nodeId = nextNodeId;
            
                var newNode:GraphNode = new GraphNode();
                newNode.nodeId = nodeId;

                if(shstIntersectionId) {
                    newNode.shstIntersectionId = shstIntersectionId;
                    await this.db.put(shstIntersectionId, JSON.stringify(newNode));
                }
                
                await this.db.put('node:' + nodeId, JSON.stringify(newNode));

                // write node xml
                osmRootElem.push({ node: [{_attr:{id:nodeId, lat:lat, lon:lon}}] });
                nextNodeId++;
            }
            
            return nodeId;
        };
        
        for(var obj of this.tileIndex.objectIndex.values()) {

            if(geomInstance(obj)) {

                // iterate through coordinates and build nodes
                var coords:number[][] = lonlatsToCoords(obj.lonlats);
                var nodeIds = [];
                for(var i = 0; i < coords.length; i++) {

                    var shstIntersectionId = null;
                    if(i === 0)
                        shstIntersectionId = obj.fromIntersectionId;
                    else if(i === coords.length - 1)
                        shstIntersectionId = obj.toIntersectionId;

                    var nodeId = await writeNode(coords[i][0], coords[i][1], shstIntersectionId);
                    nodeIds.push(nodeId);

                }

                var edge:GraphEdge = new GraphEdge();
                edge.shstGeometryId = obj.id;
                edge.edgeId = nextEdgeId;
                await this.db.put(obj.id, JSON.stringify(edge));
                await this.db.put('edge:' + edge.edgeId, JSON.stringify(edge));
            
                var nodeIdElems:{}[] = [];

                for(nodeId of nodeIds) {
                    
                    var nodeEdgeRelation:GraphNodeEdgeRelations;

                    if(await this.db.has('node-edges:' + nodeId)){
                        // insert new edge into existing node-edge relation set for node id
                        nodeEdgeRelation = JSON.parse(await this.db.get('node-edges:' + nodeId))
                        var edgeIds = new Set(nodeEdgeRelation.edgeIds);
                        edgeIds.add(edge.edgeId);
                        nodeEdgeRelation.edgeIds = [...edgeIds.values()];
                    }
                    else {
                         // create node-edge relation set for node id
                        nodeEdgeRelation = new GraphNodeEdgeRelations();
                        nodeEdgeRelation.nodeId = nodeId;
                        nodeEdgeRelation.edgeIds = [edge.edgeId];
                    }

                    await this.db.put('node-edges:' + nodeId, JSON.stringify(nodeEdgeRelation));
                    nodeIdElems.push({nd:[{_attr:{ref:nodeId}}]});
                }   
            
                var oneWay = obj.backReferenceId ? 'no' : 'yes';
                var roadClass = obj.roadClass.toLocaleLowerCase();
                osmRootElem.push({way:[{_attr:{id:edge.edgeId}},{tag:{_attr:{k:'highway', v:roadClass}}},{tag:{_attr:{k:'oneway', v:oneWay}}},...nodeIdElems]});

                nextEdgeId++;
            }
        }
          
        const writeFinished = new Promise((resolve, reject) => {
            xmlStreamWriter.on('finish', () => {  
                resolve(xmlPath);
            });
        });
        

        osmRootElem.close();
        xmlStreamWriter.close();
        //xmlStream.end();
      
        return writeFinished;
    }

    async buildGraph() {

        var graphPath = path.join(SHST_GRAPH_CACHE_DIR, this.id);
        var dbPath = path.join(graphPath, '/db');

        await this.tileIndex.indexTilesByPathGroup(this.tilePathGroup)

        if(USE_LOCAL_CACHE && existsSync(dbPath)) {
            var osrmPath = path.join(graphPath, '/graph.xml.osrm');
            //console.log(chalk.keyword('lightgreen')("     loading pre-built graph from: " + osrmPath));
            this.db = new LevelDB(dbPath);
            if(OPTIMIZE_GRAPH)
                this.osrm = new OSRM({path:osrmPath});
            else
                this.osrm = new OSRM({path:osrmPath, algorithm:"MLD"});
        }
        else {
            
            // TODO before building, check if this graph is a subset of an existing graph

            mkdirSync(dbPath, {recursive:true});
            this.db = new LevelDB(dbPath)

            console.log(chalk.keyword('lightgreen')("     building graph xml..."));
            var xmlPath = await this.createGraphXml();

            //extract 
            console.log(chalk.keyword('lightgreen')("     building graph from: " + xmlPath));
            
            var profile;

            if(this.graphMode === GraphMode.CAR)
                profile = 'node_modules/osrm/profiles/car.lua';
            else if(this.graphMode === GraphMode.BIKE)
                profile = 'node_modules/osrm/profiles/bicycle.lua';
            else if(this.graphMode === GraphMode.PEDESTRIAN)
                profile = 'node_modules/osrm/profiles/foot.lua';

            execSync('node_modules/osrm/lib/binding/osrm-extract ' + xmlPath + ' -p ' + profile);

            var osrmPath:any = xmlPath + '.osrm';

            if(OPTIMIZE_GRAPH) {
                console.log(chalk.keyword('lightgreen')("     optimizing graph (this takes awhile)..."));
                execSync('node_modules/osrm/lib/binding/osrm-contract ' + osrmPath);
                this.osrm = new OSRM({path:osrmPath});
            }
            else {
                execSync('node_modules/osrm/lib/binding/osrm-partition ' + osrmPath);
                execSync('node_modules/osrm/lib/binding/osrm-customize ' + osrmPath);
                console.log(chalk.keyword('lightgreen')("     skipping graph optimization..."));
                this.osrm = new OSRM({path:osrmPath, algorithm:"MLD"});
            }
        }
    }

    async matchTrace(feature:turfHelpers.Feature<turfHelpers.LineString>) {
    
        return new Promise(async (resolve, reject) => {
              // fall back to hmm for probabilistic path discovery
            if(!this.osrm)
                await this.buildGraph();
            
            var hmmOptions = {
                coordinates: feature.geometry.coordinates,
                annotations: true,
                geometries: 'geojson',
                radiuses: Array(feature.geometry.coordinates.length).fill(20)
            };

            try {
                var matches = await new Promise((resolve, reject) => {
                    this.osrm.match(hmmOptions, function(err, response) {
                        if (err) 
                            reject(err);
                        else
                            resolve(response)
                    });
                });

                for(var match of matches['matchings']) {
                    //
                    //console.log(match.confidence)
                    
                    
                    // if(match.confidence < MIN_CONFIDENCE)
                    //     continue;
                    // this is kind of convoluted due to the sparse info returned in the OSRM annotations...
                    // write out sequence of nodes and edges as emitted from walking OSRM-returned nodes
                    // finding the actual posistion and directionality of the OSRM-edge within the ShSt graph 
                    // edge means that we have to snap start/end points in the OSRM geom
                    var graphEdgeSequence:GraphEdge[] = [];

                    //console.log(JSON.stringify(match.geometry));

                    var edgeCandidates;
                    var nodes:number[] = [];
                    var visitedNodes:Set<number> = new Set();
                    // ooof this is brutual -- need to unpack legs and reduce list... 
                    for(var leg of match['legs']) {
                        //console.log(leg['annotation']['nodes'])
                        for(var n of leg['annotation']['nodes']){ 
                            if(!visitedNodes.has(n) || nodes.length == 0)
                                nodes.push(n);

                            visitedNodes.add(n);
                        }
                    }


                    var visitedEdges:Set<number> = new Set();
                // then group node pairs into unique edges...
                    for(var nodeId of nodes) {
                        if(await this.db.has('node:' + nodeId)) {
                            var node = JSON.parse(await this.db.get('node:' + nodeId));
                            var nodeEdges = JSON.parse(await this.db.get('node-edges:' + nodeId));
                            if(!edgeCandidates) {
                                edgeCandidates = new Set([...nodeEdges.edgeIds]);
                            }
                            else {
                                var newCandiates = new Set([...nodeEdges.edgeIds]);
                                edgeCandidates = new Set([...edgeCandidates].filter(x => newCandiates.has(x)));            
                            }
                        
                            if(edgeCandidates.size == 1) {
                                var edgeId = [...edgeCandidates][0];
                                // reduce repeating edgeIds down to one per edge
                                if(graphEdgeSequence.length == 0 || graphEdgeSequence[graphEdgeSequence.length-1].edgeId !== edgeId) {
                                    var edge = JSON.parse(await this.db.get('edge:' + edgeId));
                                    graphEdgeSequence.push(edge);
                                } 
                                edgeCandidates = new Set([...nodeEdges.edgeIds]);
                            }
                        }
                    }  

                    var pathCandidate = new PathCandidate();
                    pathCandidate.matchType = MatchType.HMM;
                    pathCandidate.score = match.confidence;
                    pathCandidate.originalFeature = feature;
                    pathCandidate.matchedPath = turfHelpers.feature(match.geometry);
                    pathCandidate.segments = [];
                    for(var geom of graphEdgeSequence) {
                        var pathSegment:PathSegment = new PathSegment();
                        pathSegment.geometryId = geom.shstGeometryId;
                        // TODO calc directionality from graph edge trajectory possible...
                        pathCandidate.segments.push(pathSegment);
                    }

                    resolve(pathCandidate);
                }
            }
            catch(e) {
                reject(null);
            }
        });
    }


    async match(feature:turfHelpers.Feature<turfHelpers.LineString>) {
        
        var options = {};
        
        if(!options['radius'])
            options['radius'] = 10;

        if(!options['snapToIntersections'])
            options['snapToIntersections'] = true;

        if(!options['useHMM'])
            options['useHMM'] = true;

        if(!options['useDirect'])
            options['useDirect'] = true;
            
        var pathCandidates:PathCandidate[] = [];
        var bestPathCandidate:PathCandidate = null;


        this.pointMatcher.searchRadius = options['radius'] * 2;

        // do default shst edge look up first
        var startPoint = turfHelpers.point(feature.geometry.coordinates[0]);
        var endPoint = turfHelpers.point(feature.geometry.coordinates[feature.geometry.coordinates.length - 1]);

        var startCandidates:PointCandidate[] = await this.pointMatcher.getPointCandidates(startPoint, null, 10);
        var endCandidates:PointCandidate[] = await this.pointMatcher.getPointCandidates(endPoint, null, 10);

        for(var i = 0; i < startCandidates.length; i++) {
            for(var j = 0; j < endCandidates.length; j++) {

                // if start and end are on the same graph edge make sure they're the same referenceId/correct direction
                if(startCandidates[i].geometryId == endCandidates[j].geometryId) {
                    
                    // skip if not on the same reference (oposing directions)
                    if(startCandidates[i].referenceId != endCandidates[j].referenceId)
                        continue;

                    // if start location is after end location skip 
                    if(startCandidates[i].location > endCandidates[j].location) 
                        continue;

                    var edgeGeom = <SharedStreetsGeometry>this.tileIndex.objectIndex.get(startCandidates[i].geometryId);

                    var pathCandidate = new PathCandidate();
                    var matchWorked:boolean = true;

                    pathCandidate.score = rmse([startCandidates[i].calcScore(), endCandidates[j].calcScore()]);
                    pathCandidate.originalFeature = feature;
                    pathCandidate.matchType = MatchType.DIRECT;
                    pathCandidate.segments = [];
            
                    try {
                        pathCandidate.matchedPath = await this.tileIndex.geom(startCandidates[i].referenceId, startCandidates[i].location,  endCandidates[j].location);
                    }
                    catch(err) {
                        pathCandidate.matchedPath = {type:"Feature", properties:[], geometry:{"type":"LineString", coordinates:[startCandidates[i].pointOnLine.geometry.coordinates[0], startCandidates[i].pointOnLine.geometry.coordinates[1]]}};//await this.tileIndex.geom(startCandidates[i].referenceId, startCandidates[i].location,  endCandidates[j].location);
                    }
                    
                    var pathSegment:PathSegment = new PathSegment();
                    pathSegment.geometryId = startCandidates[i].geometryId;
                    pathSegment.referenceId = startCandidates[i].referenceId;
                    pathSegment.section = [startCandidates[i].location, endCandidates[j].location];
                    pathSegment.toIntersectionId = edgeGeom.toIntersectionId;

                    var ref = <SharedStreetsReference>this.tileIndex.objectIndex.get(pathSegment.referenceId);
                    pathSegment.referenceLength = getReferenceLength(ref);
                    
                    pathSegment.fromIntersectionId = edgeGeom.fromIntersectionId;

                    pathCandidate.segments.push(pathSegment);
                    
                    var startDist = distance(startPoint, startCandidates[i].pointOnLine, {"units":"meters"});
                    var endDist = distance(endPoint, endCandidates[j].pointOnLine, {"units":"meters"});
                    pathCandidate.score = rmse([startDist, endDist, pathCandidate.getLengthDelta()]);
                    //console.log( pathCandidate.score)
                    pathCandidates.push(pathCandidate);

                }
            }
        }

        if(pathCandidates.length > 0) {
            pathCandidates.sort((a, b) => {
                return a.score - b.score;
            })
            
            bestPathCandidate = pathCandidates[0];

        }

       
        if(!bestPathCandidate) {
            // fall back to hmm for probabilistic path discovery
            if(!this.osrm)
                await this.buildGraph();
            
            var hmmOptions = {
                coordinates: feature.geometry.coordinates,
                annotations: true,
                geometries: 'geojson',
                radiuses: Array(feature.geometry.coordinates.length).fill(options['radius'])
            };

            try {
                var matches = await new Promise((resolve, reject) => {
                    this.osrm.match(hmmOptions, function(err, response) {
                        if (err) 
                            reject(err);
                        else
                            resolve(response)
                    });
                });

                for(var match of matches['matchings']) {
                    //
                    //console.log(match.confidence)
                    if(MIN_CONFIDENCE > match.confidence )
                        break;
                    
                    // if(match.confidence < MIN_CONFIDENCE)
                    //     continue;
                    // this is kind of convoluted due to the sparse info returned in the OSRM annotations...
                    // write out sequence of nodes and edges as emitted from walking OSRM-returned nodes
                    // finding the actual posistion and directionality of the OSRM-edge within the ShSt graph 
                    // edge means that we have to snap start/end points in the OSRM geom
                    var graphEdgeSequence:GraphEdge[] = [];

                    //console.log(JSON.stringify(match.geometry));

                    var edgeCandidates;
                    var nodes:number[] = [];
                    var visitedNodes:Set<number> = new Set();
                    // ooof this is brutual -- need to unpack legs and reduce list... 
                    for(var leg of match['legs']) {
                        //console.log(leg['annotation']['nodes'])
                        for(var n of leg['annotation']['nodes']){ 
                            if(!visitedNodes.has(n) || nodes.length == 0)
                                nodes.push(n);

                            visitedNodes.add(n);
                        }
                    }

                

                    var visitedEdges:Set<number> = new Set();
                // then group node pairs into unique edges...
                    for(var nodeId of nodes) {
                        if(await this.db.has('node:' + nodeId)) {
                            var node = JSON.parse(await this.db.get('node:' + nodeId));
                            var nodeEdges = JSON.parse(await this.db.get('node-edges:' + nodeId));
                            if(!edgeCandidates) {
                                edgeCandidates = new Set([...nodeEdges.edgeIds]);
                            }
                            else {
                                var newCandiates = new Set([...nodeEdges.edgeIds]);
                                edgeCandidates = new Set([...edgeCandidates].filter(x => newCandiates.has(x)));            
                            }
                        
                            if(edgeCandidates.size == 1) {
                                var edgeId = [...edgeCandidates][0];
                                // reduce repeating edgeIds down to one per edge
                                if(graphEdgeSequence.length == 0 || graphEdgeSequence[graphEdgeSequence.length-1].edgeId !== edgeId) {
                                    var edge = JSON.parse(await this.db.get('edge:' + edgeId));
                                    graphEdgeSequence.push(edge);
                                } 
                                edgeCandidates = new Set([...nodeEdges.edgeIds]);
                            }
                        }
                    }  
            
                    var startPoint = turfHelpers.point(match.geometry.coordinates[0]);
                    var endPoint = turfHelpers.point(match.geometry.coordinates[match.geometry.coordinates.length - 1]);

                    var startCandidates:PointCandidate[] = await this.pointMatcher.getPointCandidates(startPoint, null, 10);
                    var endCandidates:PointCandidate[] = await this.pointMatcher.getPointCandidates(endPoint, null, 10);

                    startCandidates = startCandidates.filter((item) => {
                        return item.geometryId === graphEdgeSequence[0].shstGeometryId;
                    });

                    endCandidates = endCandidates.filter((item) => {
                        return item.geometryId === graphEdgeSequence[graphEdgeSequence.length-1].shstGeometryId;
                    });

                    var alreadyIncludedPaths:Set<string> = new Set();

                    for(var i = 0; i < startCandidates.length; i++) {
                        for(var j = 0; j < endCandidates.length; j++) {

                            // if start and end are on the same graph edge make sure they're the same referenceId/correct direction
                            if(startCandidates[i].geometryId == endCandidates[j].geometryId) {
                                // skip if not on the same reference (oposing directions)
                                if(startCandidates[i].referenceId != endCandidates[j].referenceId)
                                    continue;
                                // if start location is after end location skip 
                                if(startCandidates[i].location > endCandidates[j].location) 
                                    continue;
                            }

                            var pathCandidate = new PathCandidate();
                            var matchWorked:boolean = true;

                            pathCandidate.matchType = MatchType.HMM;
                            pathCandidate.score = match.confidence;
                            pathCandidate.originalFeature = feature;
                            pathCandidate.matchedPath = turfHelpers.feature(match.geometry);

                            //console.log(JSON.stringify(pathCandidate.matchedPath));

                            pathCandidate.segments = [];

                            var length = pathCandidate.getOriginalFeatureLength();

                            for(var k = 0; k < graphEdgeSequence.length; k++) {

                                if((k == 0 && startCandidates[i].geometryId !== graphEdgeSequence[k].shstGeometryId) && 
                                    (k == graphEdgeSequence.length - 1 && endCandidates[j].geometryId != graphEdgeSequence[k].shstGeometryId)) {
                                    matchWorked = false;
                                    break;
                                }
                            
                                var pathSegment:PathSegment = new PathSegment();
                                pathSegment.geometryId = graphEdgeSequence[k].shstGeometryId;
                                pathCandidate.segments.push(pathSegment);
                            }

                            if(pathCandidate.segments.length > 0) {

                                pathCandidate.startPoint = startCandidates[i];
                            
                                // build directionality into edge sequences   
                                for(var k = 0; k < pathCandidate.segments.length; k++) {
                                    var edgeGeom = <SharedStreetsGeometry>this.tileIndex.objectIndex.get(pathCandidate.segments[k].geometryId);
                                    // if start and end are on the same graph edge make sure they're the same referenceId/direction
                                    if(startCandidates[i].geometryId == endCandidates[j].geometryId) {
                                        pathCandidate.endPoint = endCandidates[j];
                                        pathCandidate.segments[k].referenceId = pathCandidate.startPoint.referenceId;
                                        pathCandidate.segments[k].section = [startCandidates[i].location, endCandidates[j].location];
                                        var ref = <SharedStreetsReference>this.tileIndex.objectIndex.get(pathCandidate.segments[k].referenceId);
                                        pathCandidate.segments[k].referenceLength = getReferenceLength(ref);
                                    }
                                    else {
                                        if(k == 0) 
                                            pathCandidate.segments[k].referenceId = pathCandidate.startPoint.referenceId;    
                                        else {
                                            if(pathCandidate.segments[k-1].toIntersectionId == edgeGeom.fromIntersectionId){
                                                pathCandidate.segments[k].referenceId = edgeGeom.forwardReferenceId;
                                            }
                                            else if (pathCandidate.segments[k-1].toIntersectionId == edgeGeom.toIntersectionId && edgeGeom.backReferenceId)
                                                pathCandidate.segments[k].referenceId = edgeGeom.backReferenceId;
                                            else {
                                                matchWorked = false;
                                                break;
                                            }
                                        }

                                        var ref = <SharedStreetsReference>this.tileIndex.objectIndex.get(pathCandidate.segments[k].referenceId);
                                        pathCandidate.segments[k].referenceLength = getReferenceLength(ref);
                                        if(k == pathCandidate.segments.length - 1) {
                                            pathCandidate.endPoint = endCandidates[j];
                                            pathCandidate.segments[k].section = [0, endCandidates[j].location];
                                        }
                                        else if(k == 0) {
                                            pathCandidate.segments[k].section = [pathCandidate.startPoint.location, pathCandidate.segments[k].referenceLength];
                                        }
                                        else {
                                            pathCandidate.segments[k].section = [0, pathCandidate.segments[k].referenceLength];
                                        }
                                    } 
                                    // put to/from on semgnet

                                    if(edgeGeom.forwardReferenceId == pathCandidate.segments[k].referenceId) {
                                        pathCandidate.segments[k].fromIntersectionId = edgeGeom.fromIntersectionId;
                                        pathCandidate.segments[k].toIntersectionId = edgeGeom.toIntersectionId;
                                    }
                                    else {
                                        // reverse to/from for back references
                                        pathCandidate.segments[k].fromIntersectionId = edgeGeom.toIntersectionId;
                                        pathCandidate.segments[k].toIntersectionId = edgeGeom.fromIntersectionId;
                                    }                              
                                }

                                var refIdHash = uuidHash(pathCandidate.segments.map((value):string => {return value.referenceId; }).join(' '));

                                if(matchWorked && !alreadyIncludedPaths.has(refIdHash)) {
                                    alreadyIncludedPaths.add(refIdHash);
                                    bestPathCandidate = pathCandidate;
                                }   
                            }            
                        }
                    }
                }
            }
            catch(e) {
                // no-op failed to match
            }
        }
        
        if(bestPathCandidate) {
            var cleanedPath = [];
            var segCoords = [];
            for(var i = 0; i < bestPathCandidate.segments.length; i++) {
                var segment = bestPathCandidate.segments[i];
                
                // adding fudge factor for decimal precision issues
                if(segment.section[0] < segment.section[1] + options['radius'] &&  segment.section[1] <= segment.referenceLength + options['radius'] &&  segment.section[0] + options['radius'] >= 0) {
                    
                    if(options['snapToIntersections']) {
                        
                        if(i == 0 && segment.referenceLength - segment.section[0] < options['radius'])
                            continue;
                        
                        if(i == 0 && segment.section[0] < options['radius'])
                            segment.section[0] = 0;

                        if(i == bestPathCandidate.segments.length -1 && segment.section[1] < options['radius'])
                            continue;

                        if(i == bestPathCandidate.segments.length -1 && segment.referenceLength - segment.section[1] < options['radius'])
                            segment.section[1] = segment.referenceLength;

                        if( i > 0 && i < bestPathCandidate.segments.length -1) {
                            segment.section[0] = 0;
                            segment.section[1] = segment.referenceLength;
                        }
                    }

                    if(segment.section[0] == segment.section[1]) 
                        continue;

                    var segGeom = await this.tileIndex.geom(segment.referenceId, segment.section[0],  segment.section[1]);   
                    if(segGeom) {
                        cleanedPath.push(segment);
                        segCoords.push(segGeom.geometry.coordinates)
                    }
                }
            }

            bestPathCandidate.segments = cleanedPath;
            
            if(cleanedPath.length == 0)
                return null;

            if(segCoords.length > 0) {
                var segmentGeoms:turfHelpers.Feature<turfHelpers.MultiLineString> = turfHelpers.multiLineString([]);
                segmentGeoms.geometry.coordinates = [...segCoords];
                bestPathCandidate.matchedPath = segmentGeoms;
            }   
        }
        return bestPathCandidate;
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

export class PathCandidate {

    matchType:MatchType;

	score:number;
	originalFeatureLength:number;
	pathLength:number;

	startPoint:PointCandidate;
	endPoint:PointCandidate;

	segments:PathSegment[];

	originalFeature:turfHelpers.Feature<turfHelpers.Geometry>;
	matchedPath:turfHelpers.Feature<turfHelpers.Geometry>;

	sideOfStreet:ReferenceSideOfStreet;


    toDebugView():turfHelpers.FeatureCollection<turfHelpers.Geometry> {

        var debugCollection = turfHelpers.featureCollection([this.originalFeature, this.matchedPath]);
        return debugCollection;

    }

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
}
