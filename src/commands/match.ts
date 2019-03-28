import {Command, flags} from '@oclif/command'
import { readFileSync, writeFileSync } from 'fs';

import { TilePathParams, TileType, TilePathGroup } from '../tiles'

import { TileIndex } from '../tile_index'
import { Matcher } from '../match'


import * as turfHelpers from '@turf/helpers';
import geomLength from '@turf/length';

const chalk = require('chalk');

function mapOgProperties(og_props:{}, new_props:{}) {
  for(var prop of Object.keys(og_props)) {
    new_props['og_' + prop] = og_props[prop];
    console.log(new_props)
  }
}

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
    portProperties: flags.boolean({char: 'p', description: 'port existing feature properties preceeded by "og_"'}),
    bearingField: flags.string({description: 'name of optional point property containing bearing in decimal degrees', default:'bearing'}),
    stats: flags.boolean({char: 's'})

    // flag with no value (-f, --force)
    //force: flags.boolean({char: 'f'}),
  }

  static args = [{name: 'file'}]

  async run() {

    const {args, flags} = this.parse(Intersects)

    this.log(chalk.bold.keyword('green')('  🌏  Loading points...'));

    var content = readFileSync(args.file);
    var points = JSON.parse(content.toLocaleString());
  
    var params = new TilePathParams();
    params.source = 'osm/planet-180430';
    params.tileHierarchy = 6;

    this.log(chalk.bold.keyword('green')('  ✨  Matching ' + points.features.length + ' points...'));
    // test matcher point candidates
    var matcher = new Matcher(params);
  
    var matchedPoints:turfHelpers.Feature<turfHelpers.Point>[] = [];
    var unmatchedPoints:turfHelpers.Feature<turfHelpers.Point>[] = [];

    for(var searchPoint of points.features) {

      var bearing:number =null;
      if(searchPoint.properties && searchPoint.properties[flags.bearingField])
        bearing = parseFloat(searchPoint.properties[flags.bearingField]);

      var matches = await matcher.getPointCandidates(searchPoint, bearing, 3);
      if(matches.length > 0) {
        var matchedFeature = matches[0].toFeature();
        
        if(flags.portProperties)
          mapOgProperties(searchPoint.properties, matchedFeature.properties);
        
          matchedPoints.push(matches[0].toFeature());
      }
      else {
        unmatchedPoints.push(searchPoint);
      }
    }

    this.log(chalk.bold.keyword('blue')('  🎉  Matched ' + matchedPoints.length + ' points... (' +  unmatchedPoints.length + ' unmached)'));

    var featureCollection:turfHelpers.FeatureCollection<turfHelpers.Point> = turfHelpers.featureCollection(matchedPoints);
    var jsonOut = JSON.stringify(featureCollection);
    
    writeFileSync(flags.out, jsonOut);
  
  } 
}