import {Command, flags} from '@oclif/command'
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

import { TilePathParams, TileType, TilePathGroup } from '../tiles'

import { TileIndex } from '../tile_index'

import * as probuf_minimal from "protobufjs/minimal";

import * as turfHelpers from '@turf/helpers';
import geomLength from '@turf/length';
import { SharedStreetsGeometry } from 'sharedstreets-pbf/proto/sharedstreets';
import perceptron from 'simple-statistics/src/perceptron';

const linearProto = require('../proto/linear.js');
const fs = require('fs');
const chalk = require('chalk');
const path = require('path');

var filterLabelSet:Set<string> = new Set();
var filterRefIdSet:Set<string> = new Set();
var filterMinCount:number = null;

export default class Data extends Command {
  static description = 'tools for manipulating SharedsStreets event and speed data sets'

  static examples = [
    `$$$
    `,
  ]

  static flags = {
    help: flags.help({char: 'h'}),

    // flag with a value (-o, --out=FILE)
    merge: flags.string({char: 'm', description: 'merge with directory (tile union)'}),
    out: flags.string({char: 'o', description: 'output directory'}),
    stats: flags.boolean({char: 's', description: 'generate stats'}),
    'filter-label': flags.string({description: 'filter data by event label (comma separated list)'}),
    'filter-min-count': flags.string({description: 'filter minimum count per bin'}),
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

    if(flags['filter-min-count']) {
      filterMinCount = parseInt(flags['filter-min-count']);
      console.log('  filtering minimum count: ' + filterMinCount);
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

    if(flags.merge) {
      merge(inDir, flags.merge, outDir, flags.stats);
    }
    else 
      filter(inDir, outDir, flags.stats);
  } 
}

class Stats {

  dataCount:Map<string,Map<string,number>> = new Map();
  topRefCount:Map<string,Map<string,number>> = new Map();

  addType(stage:string, type:string, count:number) {

      if(!this.dataCount.has(stage)) {
        this.dataCount.set(stage, new Map());
      }

      if(!this.dataCount.get(stage).has(type)) {
        this.dataCount.get(stage).set(type, 0);
      }
      
      this.dataCount.get(stage).set(type, this.dataCount.get(stage).get(type) + count);
  }

  addRef(ref:string, type:string, count:number) {

    if(!this.topRefCount.has(ref)) {
      this.topRefCount.set(ref, new Map());
    }

    if(!this.topRefCount.get(ref).has(type)) {
      this.topRefCount.get(ref).set(type, 0);
    }
    
    this.topRefCount.get(ref).set(type, this.topRefCount.get(ref).get(type) + count);
   }
   print() {
    for(var stage of this.dataCount.keys()) {
      for(var type of this.dataCount.get(stage).keys()) {
        var value = this.dataCount.get(stage).get(type);
        console.log(stage + ":" + type + ": " + value);
      }
    }

    // TODO make top 50 refs stats an option...
    //
    // var refSort = [];
    // for(var ref of this.topRefCount.keys()) {
    //   for(var type of this.topRefCount.get(ref).keys()) {
    //     var key = ref + ":" + type;
    //     var value = this.topRefCount.get(ref).get(type);
    //     refSort.push([key, value]);
    //   }
    // }
    // refSort.sort((a, b) => {
    //   return b[1] - a[1];
    // });

    // for(var i = 0; i < 50; i++) {
    //   console.log(refSort[i][0] + ' ' + refSort[i][1])
    // }
  }
}


function filterTile(inFilePath, outFilePath, statsData) {

    var buffer = fs.readFileSync(inFilePath);
    var reader = probuf_minimal.Reader.create(buffer);

    var results = [];
    while (reader.pos < reader.len) {
    
          var result = linearProto.SharedStreetsWeeklyBinnedLinearReferences.decodeDelimited(reader);
          var filterPos =[];
          for(var i = 0; i < result.binPosition.length; i++) {
              var binPosition = result.binPosition[i];

              var filterBin = [];
              for(var j = 0; j < result.binnedPeriodicData[i].bins.length; j++) {

                  var period = result.binnedPeriodicData[i].periodOffset[j];
                  var bin = result.binnedPeriodicData[i].bins[j];

                  statsData.addType("pre-filter", "total-bins", 1);

                  var filterData = [];
                  for(var h = 0; h < bin.dataType.length; h++) {
                      bin.dataType[h] = new String(bin.dataType[h]).toLocaleLowerCase();
                      var binCount =  parseInt(bin.count[h]);
                      if((filterMinCount && filterMinCount > binCount) || (filterRefIdSet.size != 0 && !filterRefIdSet.has(result.referenceId)) || (filterLabelSet.size > 0 && filterLabelSet.has(bin.dataType[h]))) {
                          filterData.push(h);
                      }
                      
                      statsData.addType("pre-filter", bin.dataType[h], binCount);
                      statsData.addRef(result.referenceId, bin.dataType[h], binCount);
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

              statsData.addType("post-filter", "total-bins", 1);
              filteredBinCount += 1;

              for(var h = 0; h < bin.dataType.length; h++) {
                statsData.addType("post-filter", bin.dataType[h], parseInt(bin.count[h]));
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
}

async function filter(inPath, outDirectoryPath, collectStats:boolean) {

  var statsData = new Stats();

  if(fs.lstatSync(inPath).isFile()) {
    
    if(inPath.toLocaleLowerCase().endsWith('.pbf')){ 
      var outFilePath;
      if(outDirectoryPath) {
        mkdirSync(outDirectoryPath, {recursive:true});
        var fileParts = inPath.split('/');
        var outFilePath = path.join(outDirectoryPath, fileParts[fileParts.length-1]);
      }
      await filterTile(inPath, outFilePath, statsData);
    } 
    else 
      console.log("select *.pbf file...")
  }
  else {
    var files = fs.readdirSync(inPath);

    for(var file of files) {
        if(!file.toLocaleLowerCase().endsWith('.pbf'))
            continue;

        var inFilePath = path.join(inPath, file);
        var outFilePath = null;
        
        if(outDirectoryPath) {
          mkdirSync(outDirectoryPath, {recursive:true});
          outFilePath = outDirectoryPath + file;
        }
          
        if(fs.lstatSync(inFilePath).isDirectory())
            continue;
        
        console.log(inFilePath);
        await filterTile(inFilePath, outFilePath, statsData);
    }
  }

  if(collectStats) {
    statsData.print();
  }

}

function mergeTile(inFilePath1, inFilePath2, outFilePath) {

  var buffer1 = fs.readFileSync(inFilePath1);
  var reader1 = probuf_minimal.Reader.create(buffer1);

  var results1:Map<string,{}> = new Map();
  while (reader1.pos < reader1.len) {
    var result = linearProto.SharedStreetsWeeklyBinnedLinearReferences.decodeDelimited(reader1);
    var resultObj = linearProto.SharedStreetsWeeklyBinnedLinearReferences.toObject(result);
    results1.set(result.referenceId, resultObj);
  }

  var buffer2 = fs.readFileSync(inFilePath1);
  var reader2 = probuf_minimal.Reader.create(buffer2);

  var results2:Map<string,{}> = new Map();
  while (reader2.pos < reader2.len) {
    var result = linearProto.SharedStreetsWeeklyBinnedLinearReferences.decodeDelimited(reader2);
    var resultObj = linearProto.SharedStreetsWeeklyBinnedLinearReferences.toObject(result);
    results2.set(result.referenceId, resultObj);
  }

  var mergedResult:Map<string,{}> = new Map();

  const mergeLinearRefs = (linearRef1, linearRef2) => {
    var mergedRefData:Map<number,Map<number,Map<string,any>>> = new Map();
    for(var i = 0; i < linearRef1.binPosition.length; i++) {
      for(var j = 0; j < linearRef1.binnedPeriodicData[i].bins.length; j++) {
        var binPosition = linearRef1.binPosition[i];
        var period = linearRef1.binnedPeriodicData[i].periodOffset[j];
        var bin = linearRef1.binnedPeriodicData[i].bins[j];
        for(var h in bin.dataType) {
          var dataType = bin.dataType[h].toLocaleLowerCase();
          var binCount = parseInt(bin.count[h]);
          var binValue = parseInt(bin.value[h]);
          var binData = {
            'binPosition': binPosition,
            'period': period,
            'dataType': dataType,
            'binCount': binCount,
            'binValue': binValue
          };
          
          if(!mergedRefData.has(binPosition))
            mergedRefData.set(binPosition, new Map());
          if(!mergedRefData.get(binPosition).has(period))
            mergedRefData.get(binPosition).set(period, new Map());

          mergedRefData.get(binPosition).get(period).set(dataType, binData);
          // if(!mergedRefData.get(binPosition).get(period).has(dataType))
          //   mergedRefData.get(binPosition).get(period).set(dataType, new Map())
           
        }
      }
    }

    for(var i = 0; i < linearRef2.binPosition.length; i++) {
      for(var j = 0; j < linearRef2.binnedPeriodicData[i].bins.length; j++) {
        var binPosition = linearRef2.binPosition[i];
        var period = linearRef2.binnedPeriodicData[i].periodOffset[j];
        var bin = linearRef2.binnedPeriodicData[i].bins[j];
        for(var h in bin.dataType) {
          var dataType = bin.dataType[h].toLocaleLowerCase();
          var binCount = parseInt(bin.count[h]);
          var binValue = parseInt(bin.value[h]);
          var binData = {
            'binPosition': binPosition,
            'period': period,
            'dataType': dataType,
            'binCount': binCount,
            'binValue': binValue
          };
          
          if(!mergedRefData.has(binPosition))
            mergedRefData.set(binPosition, new Map());
          if(!mergedRefData.get(binPosition).has(period))
            mergedRefData.get(binPosition).set(period, new Map());

          if(mergedRefData.get(binPosition).get(period).has(dataType)) {
              
              var prevBinData = mergedRefData.get(binPosition).get(period).get(dataType)
              prevBinData.binCount += binCount;
              prevBinData.binValue += binValue;

              mergedRefData.get(binPosition).get(period).set(dataType, prevBinData); 
          }
          else
            mergedRefData.get(binPosition).get(period).set(dataType, binData);  
        }
      }
    }

    var mergedRef = {
      'referenceId':linearRef2.referenceId,
      'numberOfBins':linearRef2.numberOfBins,
      'referenceLength':linearRef2.referenceLength.toNumber(true),
      'binPosition':new Array(),
      'binnedPeriodicData':new Array()
    };

    for(var pos of mergedRefData.keys()) {
     
      var periods = {
        'periodOffset':new Array(),
        'bins':new Array()
      }

      for(var per of mergedRefData.get(pos).keys()) {

        var b = {
          'dataType':new Array(),
          'count':new Array(),
          'value':new Array()
        }
        

        for(var dt of mergedRefData.get(pos).get(per).values()) {
          b.dataType.push(dt['dataType']);
          b.count.push(parseInt(dt['binCount']));
          b.value.push(parseInt(dt['binValue']));
        }

        periods.periodOffset.push(per);
        periods.bins.push(b);

      }
      mergedRef.binnedPeriodicData.push(periods);
      mergedRef.binPosition.push(pos);
    }
    var refMessageObj = linearProto.SharedStreetsWeeklyBinnedLinearReferences.fromObject(mergedRef);
    return refMessageObj;
  };

  for(var referenceId of results1.keys()) {
    if(!mergedResult.has(referenceId)) {
      mergedResult.set(referenceId, results1.get(referenceId));
    }
  }

  for(var referenceId of results2.keys()) {
    if(results1.has(referenceId)) {
      var mergedRef = mergeLinearRefs(results1.get(referenceId), results2.get(referenceId));
      mergedResult.set(referenceId, mergedRef);
    }
    else if(!mergedResult.has(referenceId)) {
      mergedResult.set(referenceId, results2.get(referenceId));
    }
  }

  for(var merged of mergedResult.values()) {
    const writer = new probuf_minimal.BufferWriter();
    linearProto.SharedStreetsWeeklyBinnedLinearReferences.encodeDelimited(merged, writer);

    fs.appendFileSync(outFilePath, writer.finish(), function(err) {
      if(err) {
          return console.log(err);
      }
    });
  }
}

async function merge(inDirectoryPath1, inDirectoryPath2, outDirectoryPath, stats:boolean) {

  var files = fs.readdirSync(inDirectoryPath1);

  for(var file of files) {
      if(!file.toLocaleLowerCase().endsWith('.pbf'))
          continue;

      var inFilePath1 = path.join(inDirectoryPath1, file);
      var inFilePath2 = path.join(inDirectoryPath2, file);
      var outFilePath = null;
      console.log(inFilePath1);
      if(outDirectoryPath) {
        mkdirSync(outDirectoryPath, {recursive:true});
        outFilePath = path.join(outDirectoryPath, file);
      }
      
      if(fs.lstatSync(inFilePath1).isDirectory())
          continue;

      if(!fs.existsSync(inFilePath2))
        continue;
       
      console.log(inFilePath1 + " + " + inFilePath2); 
      mergeTile(inFilePath1, inFilePath2, outFilePath);
  }

}

