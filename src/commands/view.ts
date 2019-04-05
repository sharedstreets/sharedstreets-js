import {Command, flags} from '@oclif/command'

import { readFileSync, writeFileSync, mkdirSync } from 'fs';

import { TilePathParams, TileType, TilePathGroup } from '../tiles'
import { TileIndex } from '../tile_index'
import { EventData, weekTest } from '../events'

import * as probuf_minimal from "protobufjs/minimal";

import * as turfHelpers from '@turf/helpers';
import geomLength from '@turf/length';
import { SharedStreetsGeometry } from 'sharedstreets-pbf/proto/sharedstreets';

var linearProto = require('../proto/linear.js');
var fs = require('fs');
const chalk = require('chalk');
const Hapi = require('hapi');



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
    const server=Hapi.server({
        host:'localhost',
        port:8000
    });

    server.route({
        method:'GET',
        path:'/api/weeks',
        handler:function(request,h) {
            var weeks = eventData.getWeeks();
            return weeks;
        }
    });

    server.route({
        method:'GET',
        path:'/api/bins',
        handler:function(request,h) {
            
            return ;
        }
    });

    server.route({
        method:'GET',
        path:'/api/rank',
        handler:function(request,h) {
            var weeks = eventData.getWeeks();
            return weeks;
        }
    });

    server.route({
        method:'GET',
        path:'/api/summary',
        handler:function(request,h) {
            var weeks = eventData.getWeeks();
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

    console.log('Server running at:', server.info.uri);
}

server('./out_tiles/');