import * as turfHelpers from '@turf/helpers';
import { TilePathParams, TilePathGroup, TileType } from './tiles';
import { existsSync, mkdirSync, open, createWriteStream } from 'fs';
import { LevelUp } from 'levelup';
import { TileIndex } from './tile_index';
import { lonlatsToCoords } from './index';
import { SharedStreetsGeometry } from 'sharedstreets-types';

const OSRM = require("osrm");
const xml = require('xml');
const levelup = require('levelup');
const leveldown = require('leveldown');
const chalk = require('chalk');
const { exec } = require('child_process');

const uuidHash = require('uuid-by-string');

const OPTIMIZE_GRAPH = false;
const USE_LOCAL_CACHE = true;
const SHST_GRAPH_CACHE_DIR = './shst/cache/graphs/';
// interface typecheck for SharedStreetsGeometry
function geomInstance(object: any): object is SharedStreetsGeometry {
    return 'forwardReferenceId' in object;
}

class GraphWay {
    shstId:string;
    wayId:number;
}

class GraphNode {
    shstId:string;
    nodeId:number;
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
    tilePathGroup:TilePathGroup;
    tileIndex:TileIndex;

    constructor(extent:turfHelpers.Feature<turfHelpers.Polygon>, params:TilePathParams, existingTileIndex:TileIndex=null) {

        this.tilePathGroup = TilePathGroup.fromPolygon(extent, 1000, params);
        this.tilePathGroup.addType(TileType.GEOMETRY);
        this.tilePathGroup.addType(TileType.REFERENCE);

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

        // create id from tile path hash  
        this.id = uuidHash(paths.join(" "));
    }

    async buildGraph() {

        var graphPath = SHST_GRAPH_CACHE_DIR + this.id;
        var dbPath = graphPath + '/db';

        await this.tileIndex.indexTilesByPathGroup(this.tilePathGroup)

        if(USE_LOCAL_CACHE && existsSync(dbPath)) {
            var osrmPath = graphPath + '/graph.xml.osrm';
            console.log(chalk.keyword('lightgreen')("     loading pre-built graph from: " + osrmPath));
            this.db = new LevelDB(dbPath);
            this.osrm = new OSRM({path:"osrmPath", algorithm:"MLD"});
        }
        else {
            
            // TODO before building, check if this graph is a subset of an existing graph

            mkdirSync(dbPath, {recursive:true});
            this.db = new LevelDB(dbPath);

            var nextNodeId:number = 1;
            var nextWayId:number = 1;


            // build xml representation of graph + leveldb id map
            var xmlPath = graphPath + '/graph.xml';

            var xmlStreamWriter = createWriteStream(xmlPath);

            
     
            var osmRootElem = xml.element({ _attr: { version: '0.6', generator: 'shst cli v1.0'} });
            var stream = xml({ osm: osmRootElem }, { stream: true });
            stream.on('data', function (chunk) {xmlStreamWriter.write(chunk)});
        
            for(var obj of this.tileIndex.objectIndex.values()) {
                if(geomInstance(obj)) {
                    const writeNode = async (lon:number, lat:number, shstId:string=null):Promise<number> => {
                        var nodeId:number;
                        if(shstId) {
                            // check if intersection node already written
                            if(! await this.db.has(shstId)) {
                                nodeId = nextNodeId;
                                nextNodeId++;

                                // index graph node for re-use
                                var newNode:GraphNode = new GraphNode();
                                newNode.nodeId = nodeId;
                                newNode.shstId = shstId;
                                await this.db.put(shstId, JSON.stringify(newNode));
                                await this.db.put('node:' + nodeId, JSON.stringify(newNode));

                                // write node xml
                                osmRootElem.push({ node: [{_attr:{id:nodeId, lat:lat, lon:lon}}] });
                            }
                            else{
                                var node:GraphNode =  JSON.parse(await this.db.get(shstId));
                                nodeId = node.nodeId;
                            }
                        }
                        else {
                            // write intermediary node but don't index as it's only used inside the edge

                            nodeId = nextNodeId;
                            nextNodeId++;

                            // write node xml
                            osmRootElem.push({ node: [{_attr:{id:nodeId, lat:lat, lon:lon}}] });
                        }
                        
                        return nodeId;
                    };
                    

                    // iterate through coordinates and build nodes
                    var coords:number[][] = lonlatsToCoords(obj.lonlats);
                    var nodeIdElems:{}[] = [];
                    for(var i = 0; i < coords.length; i++) {
                        var shstId = null;
                        if(i === 0)
                            shstId = obj.fromIntersectionId;
                        else if(i === coords.length - 1)
                            shstId = obj.toIntersectionId;

                        var nodeId = await writeNode(coords[i][0], coords[i][1], shstId);
                        nodeIdElems.push({nd:[{_attr:{ref:nodeId}}]});
                    }
                
                    var way:GraphWay = new GraphWay();
                    way.shstId= obj.id;
                    way.wayId = nextWayId;
                    await this.db.put(obj.id, JSON.stringify(way));
                    await this.db.put('way:' + nextWayId, JSON.stringify(way))

                    osmRootElem.push({way:[{_attr:{id:way.wayId}},{tag:{_attr:{k:'highway', v:'primary'}}},...nodeIdElems]});

                    nextWayId++;
                }
            }

            osmRootElem.close();
            await streamPromise(xmlStreamWriter);

            // extract 
            // console.log(chalk.keyword('lightgreen')("     building graph from: " + xmlPath));
            // console.log('./node_modules/osrm/lib/binding/osrm-extract ' + xmlPath + ' -p ./node_modules/osrm/profiles/car.lua')
            // await exec('./node_modules/osrm/lib/binding/osrm-extract ' + xmlPath + ' -p ./node_modules/osrm/profiles/car.lua');

            // var osrmPath = xmlPath + '.osrm';

            // if(OPTIMIZE_GRAPH) {
            //     console.log(chalk.keyword('lightgreen')("     optimizing graph (this takes awhile)..."));
            //     await exec('./node_modules/osrm/lib/binding/osrm-contract ' + osrmPath);
            // }
            // else {
            //     //await exec('./node_modules/osrm/lib/binding/osrm-partition ' + osrmPath);
            //     //await exec('./node_modules/osrm/lib/binding/osrm-customize ' + osrmPath);
            //     console.log(chalk.keyword('lightgreen')("     skipping graph optimization..."));
            // }

            //this.osrm = new OSRM(osrmPath);
        }
    }

    async match(feature:turfHelpers.Feature<turfHelpers.LineString>) {
        
        if(!this.osrm)
            await this.buildGraph()
        
        var options = {
                coordinates: feature.geometry.coordinates
        };

        var match = this.osrm.match(options, function() {
        });

        console.log(JSON.stringify(match));
    }
}