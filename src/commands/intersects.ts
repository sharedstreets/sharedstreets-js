import {Command, flags} from '@oclif/command'
import { readFileSync, writeFileSync } from 'fs';

import { TilePathParams, TileType, TilePathGroup } from '../index'
import { TileIndex } from '../index'

import geomLength from '@turf/length';

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

  
    var data = await tileIndex.intersects(polygon, TileType.GEOMETRY, 0, params);

    if(flags.stats) {

      var totalLength = 0;
      for(var feature of data.features) {
        var segmentLength = geomLength(feature, {units: "meters"});
        totalLength += segmentLength;
      }
      totalLength = Math.round(totalLength * 100) / 100;
      this.log(chalk.keyword('blue')('Total Segment Length: ') + chalk.bold.keyword('blue')(totalLength));

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