import {Command, flags} from '@oclif/command'
import { readFileSync, writeFileSync } from 'fs';

import { TilePathParams, TileType, TilePathGroup } from '../tiles'
import { TileIndex } from '../tile_index'

import geomLength from '@turf/length';
import { SharedStreetsGeometry } from 'sharedstreets-pbf/proto/sharedstreets';

const chalk = require('chalk');

export default class Intersects extends Command {
  static description = 'queries streets by polygon data and returns GeoJSON output of all intersecting features'

  static examples = [
    `$ shst intersects polygon.geojson --out=output.geojson
  🌏 Loading polygon...
  🗄️ Loading SharedStreets tiles...
  🔍 Searching data...
    `,
  ]

  static flags = {
    help: flags.help({char: 'h'}),

    // flag with a value (-o, --out=FILE)
    out: flags.string({char: 'o', description: 'output file'}),
    stats: flags.boolean({char: 's'})

    // flag with no value (-f, --force)
    //force: flags.boolean({char: 'f'}),
  }

  static args = [{name: 'file'}]

  async run() {
    const {args, flags} = this.parse(Intersects)

    if(flags.out)
      this.log(chalk.bold.keyword('green')('  🌏  Loading polygon...'));

    var content = readFileSync(args.file);
    var polygon = JSON.parse(content.toLocaleString());
  
    if(flags.out)
      this.log(chalk.bold.keyword('green')('  🗄️  Loading SharedStreets tiles...'));

    var params = new TilePathParams();
    params.source = 'osm/planet-180430';
    params.tileHierarchy = 6;

    var tileIndex = new TileIndex();

    if(flags.out)
      this.log(chalk.bold.keyword('green')('  🔍  Searching data...'));

  
    var data = await tileIndex.intersects(polygon, TileType.GEOMETRY, params);

    if(flags.stats) {

      var lengthByClass = {};
      var totalLength = 0;
      var oneWayLength = 0;
      for(var feature of data.features) {
        var geom = <SharedStreetsGeometry>tileIndex.objectIndex.get(feature.properties.id);
        var roadClass = geom.roadClass;
        if(!lengthByClass[roadClass])
          lengthByClass[roadClass] = 0;
        
        var segmentLength = geomLength(feature, {units: "meters"});
        lengthByClass[roadClass] += segmentLength;
        totalLength += segmentLength;
      }
      
      this.log(chalk.keyword('blue')('\tSegment length:'));

      var lengthByClassArray = Object.keys(lengthByClass).map(function(key) {
        return [key, lengthByClass[key]];
      });

      lengthByClassArray.sort(function(first, second) {
        return second[1] - first[1];
      });

      for(var item of lengthByClassArray) {
        var length = Math.round(item[1]);
        this.log(chalk.keyword('lightblue')('\t' + item[0] + ': ') + chalk.keyword('lightblue')(length + ' m'));
      }

      totalLength = Math.round(totalLength);
      this.log(chalk.bold.keyword('lightblue')('\t' + 'Total Segment Length: ') + chalk.bold.keyword('lightblue')(totalLength + ' m'));

    }
    else {
      var jsonOut = JSON.stringify(data);
    
      if(flags.out){
        writeFileSync(flags.out, jsonOut);
      }
      else
        this.log(jsonOut);
    }
  }
}