import {Command, flags} from '@oclif/command'
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

import { TilePathParams, TileType, TilePathGroup } from '../tiles'

import { TileIndex } from '../tile_index'

import * as probuf_minimal from "protobufjs/minimal";

import * as turfHelpers from '@turf/helpers';
import geomLength from '@turf/length';
import { SharedStreetsGeometry } from 'sharedstreets-pbf/proto/sharedstreets';

var linearProto = require('../proto/linear.js');
var fs = require('fs');
const chalk = require('chalk');

var filterLabelSet:Set<string> = new Set();
var filterRefIdSet:Set<string> = new Set();
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
    stats: flags.boolean({char: 's', description: 'generate stats'}),
    'filter-label': flags.string({description: 'filter data by event label (comma separated list)'}),
    'filter-min-count': flags.boolean({description: 'filter minimum count per bin'}),
    'filter-polygon': flags.string({description: 'filter data by polygon'})
  }

  static args = [{name: 'dir'}]

  async run() {
    const {args, flags} = this.parse(Data)

    if(flags['filter-label']) {
      var filters = flags['filter-label'].split(',').map((a) => { return a.toLocaleLowerCase()});
      filterLabelSet = new Set(filters);
      console.log('  filtering events: ' + filters.join(', '))
    }

    if(flags['filter-polygon']) {
      var content = readFileSync(flags['filter-polygon']);
      var polygon = JSON.parse(content.toLocaleString());
      console.log('  filtering polygon: ' + flags['filter-polygon']);

      var params = new TilePathParams();
      params.source = 'osm/planet-180430';
      params.tileHierarchy = 6;

      let tileIndex = new TileIndex();
      let data = await tileIndex.intersects(polygon, TileType.GEOMETRY, params);

      for(var feature of data.features) {
        var geom = <SharedStreetsGeometry>tileIndex.objectIndex.get(feature.properties.id);
        filterRefIdSet.add(geom.forwardReferenceId)
        if(geom.backReferenceId)
          filterRefIdSet.add(geom.backReferenceId)
      }

      console.log(chalk.keyword('green')("     filtering on  " + filterRefIdSet.size + " edges"));

    }

    var inDir = args.dir;
    var outDir = flags.out;

    if(fs.existsSync(outDir)) {
      console.log(chalk.keyword('orange')("     output directory already exists: " + outDir));
      return;
    }

    loadTiles(inDir, outDir, flags.stats);
  } 
}


function processTile(inFilePath, outFilePath, stats) {

    var buffer = fs.readFileSync(inFilePath);
    var reader = probuf_minimal.Reader.create(buffer);

    var preCount = 0;
    var postCount = 0;
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
                      if((minCount && minCount > bin.count[h]) || (filterRefIdSet.size > 0 && !filterRefIdSet.has(result.referenceId)) || filterLabelSet.has(bin.dataType[h])) {
                          filterData.push(h);
                      }

                      preCount += parseInt(bin.count[h]);
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

          var filteredBinCount = 0;
          var filterPos = [];
          for(var i = 0; i < result.binPosition.length; i++) {
            for(var j = 0; j < result.binnedPeriodicData[i].bins.length; j++) {
              var period = result.binnedPeriodicData[i].periodOffset[j];
              var bin = result.binnedPeriodicData[i].bins[j];
              for(var h = 0; h < bin.dataType.length; h++) {
                postCount += parseInt(bin.count[h]);
                filteredBinCount += 1;
              }
            }
          }
        

          if(outFilePath && filteredBinCount > 0) {
            const writer = new probuf_minimal.BufferWriter();
            if(result.binnedPeriodicData.length > 0) {
              linearProto.SharedStreetsWeeklyBinnedLinearReferences.encodeDelimited(result, writer);
            }
      
            fs.appendFileSync(outFilePath, writer.finish(), function(err) {
                if(err) {
                    return console.log(err);
                }
            });
          }
    }
    
    console.log(chalk.keyword('blue')("     pre-filter count: " + preCount));
    console.log(chalk.keyword('blue')("     post-filter count: " + postCount));
    console.log();

    return results; 
}

async function loadTiles(inDirectoryPath, outDirectoryPath, stats:boolean) {

    var files = fs.readdirSync(inDirectoryPath);

    for(var file of files) {

        var inFilePath = inDirectoryPath + file;
        var outFilePath = null;
        
        if(outDirectoryPath) {
          mkdirSync(outDirectoryPath, {recursive:true});
          outFilePath = outDirectoryPath + file;
        }
          
        if(fs.lstatSync(inFilePath).isDirectory())
            continue;
        console.log(chalk.keyword('lightblue')("     input file: " + inFilePath));
        console.log(chalk.keyword('lightblue')("     output file: " + outFilePath));
      
        var results = processTile(inFilePath, outFilePath, stats);
    }
}



