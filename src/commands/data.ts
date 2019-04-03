import {Command, flags} from '@oclif/command'
import { readFileSync, writeFileSync } from 'fs';

import { TilePathParams, TileType, TilePathGroup } from '../tiles'

import { TileIndex } from '../tile_index'

import * as probuf_minimal from "protobufjs/minimal";

import * as turfHelpers from '@turf/helpers';
import geomLength from '@turf/length';

var linearProto = require('../proto/linear.js');
var fs = require('fs');
const chalk = require('chalk');

var filterSet:Set<string> = new Set();
var minCount:number = null;

export default class Data extends Command {
  static description = 'tools for manipulating SharedsStreets event and speed data sets'

  static examples = [
    `$$$
    `,
  ]

  static flags = {
    help: flags.help({char: 'h'}),

    // flag with a value (-o, --out=FILE)
    out: flags.string({char: 'o', description: 'output directory'}),
    filter: flags.string({char: 'f', description: 'filter events'}),
    stats: flags.boolean({char: 's', description: 'generate stats'}),
    'min-count': flags.boolean({char: 'm', description: 'minimum count per bin'})
  }

  static args = [{name: 'dir'}]

  async run() {
    const {args, flags} = this.parse(Data)

    if(flags.filter) {
      var filters = flags.filter.split(',').map((a) => { return a.toLocaleLowerCase()});
      filterSet = new Set(filters);
    }


    var inDir = args.dir;
    loadTiles(inDir, flags.stats);
  } 
}


function processTile(filePath) {

    var buffer = fs.readFileSync(filePath);
    var reader = probuf_minimal.Reader.create(buffer);

    var count = 0;
    var results = [];
    while (reader.pos < reader.len) {
    
          var result = linearProto.SharedStreetsWeeklyBinnedLinearReferences.decodeDelimited(reader);

          var filterPos = [];
          for(var i = 0; i < result.binPosition.length; i++) {
              var binPosition = result.binPosition[i];

              var filterBin = [];
              for(var j = 0; j < result.binnedPeriodicData[i].bins.length; j++) {

                  var period = result.binnedPeriodicData[i].periodOffset[j];
                  var bin = result.binnedPeriodicData[i].bins[j];

                  var filterData = [];
                  for(var h = 0; h < bin.dataType.length; h++) {
                      bin.dataType[h] = new String(bin.dataType[h]).toLocaleLowerCase();
                      if(filterSet.has(bin.dataType[h])) {
                          filterData.push(h);
                      }

                      count += parseInt(bin.count[h]);
                  }

                  for(var hDel of filterData.sort(function(a, b){return b-a})) {
                      result.binnedPeriodicData[i].bins[j].dataType.splice(hDel,1);
                      result.binnedPeriodicData[i].bins[j].count.splice(hDel,1);
                      result.binnedPeriodicData[i].bins[j].value.splice(hDel,1);
                  }

                  if(result.binnedPeriodicData[i].bins[j].dataType.length == 0 )
                  {
                      filterBin.push(j);
                  }
              }

              for(var jDel of filterBin.sort(function(a, b){return b-a})) {
                  result.binnedPeriodicData[i].bins.splice(jDel,1);
                  result.binnedPeriodicData[i].periodOffset.splice(jDel,1);
              }

              if(result.binnedPeriodicData[i].bins.length == 0 )
              {
                  filterPos.push(i);
              }
          }

          for(var iDel of filterPos.sort(function(a, b){return b-a})) {
              result.binnedPeriodicData.splice(iDel,1);
              result.binPosition.splice(iDel,1);
          } 
    
          results.push(result)
    }
    console.log("pre-filter count: " + count);

    return results; 
}



async function loadTiles(directoryPath, stats:boolean) {

    var files = fs.readdirSync(directoryPath);

    for(var file of files) {
        var filePath = directoryPath + file;

        if(fs.lstatSync(filePath).isDirectory())
            continue;
        var count = 0;
        console.log(filePath);
      
        var results = processTile(filePath);
        if(stats) {
          for(var result of results) {
            var filterPos = [];
            for(var i = 0; i < result.binPosition.length; i++) {
              for(var j = 0; j < result.binnedPeriodicData[i].bins.length; j++) {
                var period = result.binnedPeriodicData[i].periodOffset[j];
                var bin = result.binnedPeriodicData[i].bins[j];
                for(var h = 0; h < bin.dataType.length; h++) {
                  count += parseInt(bin.count[h]);
                }
              }
            }
          }
          console.log("post-filter count: " + count);  
        }
      }

        //const writer = new probuf_minimal.BufferWriter();
        // if(result.binnedPeriodicData.length > 0) {
        //   linearProto.SharedStreetsWeeklyBinnedLinearReferences.encodeDelimited(result, writer);
          //console.log(filteredResult);
        // }
        // fs.writeFileSync(outPath + file, filteredBuffer.finish(), function(err) {

        //     if(err) {
        //         return console.log(err);
        //     }
        
        //     console.log(file + " saved!");
        // });
        // console.log(file +  " done");
  }



