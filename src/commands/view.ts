import {Command, flags} from '@oclif/command'

import { readFileSync, writeFileSync, mkdirSync } from 'fs';

import { TilePathParams, TileType, TilePathGroup } from '../tiles'
import { TileIndex } from '../tile_index'
import { EventData, weekTest } from '../events'

import * as probuf_minimal from "protobufjs/minimal";

import * as turfHelpers from '@turf/helpers';
import geomLength from '@turf/length';
import turfBbox from '@turf/bbox';
import turfBboxPolygon from '@turf/bbox-polygon';

import { SharedStreetsGeometry } from 'sharedstreets-pbf/proto/sharedstreets';
import envelope from '@turf/envelope';

const linearProto = require('../proto/linear.js');
const fs = require('fs');
const chalk = require('chalk');

const Path = require('path');
const Hapi = require('hapi');
const Inert = require('inert');



export default class View extends Command {
  static description = 'tools for viewing SharedStreets data sets'

  static examples = [
    `$$$
    `
  ]

  static flags = {
    help: flags.help({char: 'h'})
  }

  static args = [{name: 'dir'}]

  async run() {
    const {args, flags} = this.parse(View);

    server(args.dir);
  } 
}

class EventDataRequest {
 
    weeks:string[];
    typeFilter:string[];
    periodFilter:number[];
    extent:string[];

    constructor(request) {
        if(request.query) {

            if(request.query.weeks) {
                var weekParts = request.query.weeks.split(",");
                for(var weekPart of weekParts) {
                    if(weekTest.test(weekPart)) {
                        if(!this.weeks)
                            this.weeks = [];
                        this.weeks.push(weekPart)
                    }       
                }
            }

            if(request.query.bounds) {
                var weekParts = request.query.weeks.split(",");
                for(var weekPart of weekParts) {
                    if(weekTest.test(weekPart)) {
                        if(!this.weeks)
                            this.weeks = [];
                        this.weeks.push(weekPart)
                    }       
                }
            }
        }
    }
}

async function server(dirPath:string) {

    const eventData = new EventData(dirPath);
    
    // Create a server with a host and port
    const server = new Hapi.Server({
        port: 3000,
        routes: {
            files: {
                relativeTo: Path.join(__dirname, 'public')
            }
        }
    });

    var corsHeaders = {
        origin: ["*"],
        headers: ['Origin', 'X-Requested-With', 'Content-Type'],
        credentials: true,
        additionalHeaders: ['access-control-allow-headers', 'Access-Control-Allow-Origin, Access-Control-Allow-Headers, Origin, X-Requested-With, Content-Type, CORRELATION_ID'],
        additionalExposedHeaders: ['access-control-allow-headers', 'Access-Control-Allow-Origin, Access-Control-Allow-Headers, Origin, X-Requested-With, Content-Type, CORRELATION_ID']
    };

    const bboxToPolygon = (bboxString) => {
        var bboxParts = bboxString.split(",").map((s) => {return Number.parseFloat(s)});
        if(bboxParts.length == 4) {
            var line = turfHelpers.lineString([[bboxParts[0],bboxParts[1]],[bboxParts[2],bboxParts[3]]]);
            var bbox = turfBbox(line);
            var bboxPolygon = turfBboxPolygon(bbox);
            return bboxPolygon;
        }
    };

    const weekFilterParser = (weeksString):string[] => {
        var weeks = weeksString.split(',');
        return weeks;
    };

    const periodFilterParser = (periodFilter) => {
        var ranges = periodFilter.split(',');
        var filter:Set<number> = new Set();
        for(var range of ranges) {
            var parts = range.split("-")
   
            if(parts[1]) {
                var start = parseInt(parts[0]);
                var end = parseInt(parts[1]);

                for(var i = start; i<=end; i++){
                    filter.add(i);
                }
            }
            else {
                filter.add(parseInt(parts[0]));
            }
        }
        
        return filter;
    };

    const typeFilterParser = (typeFilter) => {
        var types:{}[] = [];
        if(typeFilter) {
            var typeStrings = typeFilter.split(";");
            for(var typeString of typeStrings) {
                var typeParts = typeString.split(":");
                var type = {};
                type['type'] = typeParts[0];
                if(typeParts[1])
                    type['offset'] = parseInt(typeParts[1]);
                if(typeParts[2])
                    type['color'] = typeParts[2];
                types.push(type)
            }
        }
        return types;
    };

    await server.register(Inert);
 
    server.route({
        method: 'GET',
        path: '/{param*}',
        handler: {
            directory: {
                path: '.',
                redirectToSlash: true,
                index: true,
            }
        }
    });

    server.route({
        method:'GET',
        config: {
            cors: corsHeaders
          },
        path:'/api/weeks',
        handler:function(request,h) {
            var weeks = eventData.getWeeks();
            return weeks;
        }
    });

    server.route({
        method:'GET',
        config: {
            cors: corsHeaders
          },
        path:'/api/types',
        handler:function(request,h) {
            var weeks = eventData.getTypes();
            return weeks;
        }
    });

    server.route({
        method:'GET',
        config: {
            cors: corsHeaders
          },
        path:'/api/bins',
        handler:async function(request,h) {

            var extent;
            if(request.query.bbox)
                extent = bboxToPolygon(request.query.bbox);
            else    
                extent = JSON.parse(request.query.polygon);

            var typeFilters = typeFilterParser(request.query.typeFilter);
            var periodFilter = periodFilterParser(request.query.periodFilter);
            var weeks = weekFilterParser(request.query.weeks);
            var bins = await eventData.getBins(extent, weeks, typeFilters, periodFilter);
            return bins;

        }
    });

    server.route({
        method:'GET',
        config: {
            cors: corsHeaders
          },
        path:'/api/rank',
        handler:function(request,h) {
            var weeks = eventData.getWeeks();
            return weeks;
        }
    });

    server.route({
        method:'GET',
        config: {
            cors: corsHeaders
          },
        path:'/api/summary',
        handler: async function(request,h) {
            var extent = bboxToPolygon(request.query.bbox);
            var typeFilters = typeFilterParser(request.query.typeFilter);
            var periodFilter = periodFilterParser(request.query.periodFilter);
            var weeks = eventData.getSummary(extent, '', typeFilters, periodFilter);
            return weeks;
        }
    });

    try {
        await server.start();
    }
    catch (err) {
        console.log(err);
        process.exit(1);
    }

    console.log('Server running at: http://localhost:3000/'); // server.info.uri
}
