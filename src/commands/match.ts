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
    `$ shst match points.geojson --out=matched_points.geojson --portProperties
  🌏  Loading points...
  ✨  Matching 3 points...
  🎉  Matched 2 points... (1 unmached)
    `,
  ]

  static flags = {
    help: flags.help({char: 'h'}),

    // flag with a value (-o, --out=FILE)
    out: flags.string({char: 'o', description: 'output file'}),
    portProperties: flags.boolean({char: 'p', description: 'port existing feature properties preceeded by "og_"', default: false}),
    bearingField: flags.string({description: 'name of optional point property containing bearing in decimal degrees', default:'bearing'}),
    stats: flags.boolean({char: 's'})

    // flag with no value (-f, --force)
    //force: flags.boolean({char: 'f'}),
  }

  static args = [{name: 'file'}]

  async run() {

    const {args, flags} = this.parse(Intersects)

    this.log(chalk.bold.keyword('green')('  🌏  Loading geojson data...'));

    var inFile = args.file;

    var outFile = flags.out;

    if(!outFile) 
      outFile = inFile;

    if(outFile.toLocaleLowerCase().endsWith(".geojson")  || outFile.toLocaleLowerCase().endsWith(".geojson"))
      outFile = outFile.split(".").slice(0, -1).join(".");

    var content = readFileSync(inFile);
    var data:turfHelpers.FeatureCollection<turfHelpers.Geometry> = JSON.parse(content.toLocaleString());
  
    var params = new TilePathParams();
    params.source = 'osm/planet-180430';
    params.tileHierarchy = 6;

    if(data.features[0].geometry.type  === 'LineString') {
      await matchLines(outFile, params, data, flags);
    }
    else if(data.features[0].geometry.type === 'Point') {
      await matchPoints(outFile, params, data, flags);
    }
  } 
}

async function matchPoints(outFile, params, points, flags) {

  console.log(chalk.bold.keyword('green')('  ✨  Matching ' + points.features.length + ' points...'));
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
      
        matchedPoints.push(matchedFeature);
    }
    else {
      unmatchedPoints.push(searchPoint);
    }
  }

  if(matchedPoints.length) {
    console.log(chalk.bold.keyword('blue')('  ✏️  Writing ' + matchedPoints.length + ' matched points: ' + outFile + ".matched.geojson"));
    var matchedFeatureCollection:turfHelpers.FeatureCollection<turfHelpers.Point> = turfHelpers.featureCollection(matchedPoints);
    var matchedJsonOut = JSON.stringify(matchedFeatureCollection);
    writeFileSync(outFile + ".matched.geojson", matchedJsonOut);
  }

  if(unmatchedPoints.length ) {
    console.log(chalk.bold.keyword('blue')('  ✏️  Writing ' + unmatchedPoints.length + ' unmatched points: ' + outFile + ".unmatched.geojson"));
    var unmatchedFeatureCollection:turfHelpers.FeatureCollection<turfHelpers.Point> = turfHelpers.featureCollection(unmatchedPoints);
    var unmatchedJsonOut = JSON.stringify(unmatchedFeatureCollection);
    writeFileSync(outFile + ".unmatched.geojson", unmatchedJsonOut);
  }
}


async function matchLines(outFile, params, lines, flags) {

  console.log(chalk.bold.keyword('green')('  ✨  Matching ' + lines.features.length + ' lines...'));
  // test matcher point candidates
  var matcher = new Matcher(params);

  var matchedLines:turfHelpers.Feature<turfHelpers.LineString>[] = [];
  var unmatchedLines:turfHelpers.Feature<turfHelpers.LineString>[] = [];

  for(var line of lines.features) {

    var bearing:number =null;
  
    var matches = await matcher.matchFeatureCollection(turfHelpers.featureCollection([line]));
    console.log(JSON.stringify(matches))
    if(matches.matched.features.length > 0) {
      var matchedFeature = matches.matched.features[0];
      
      if(flags.portProperties)
        mapOgProperties(line.properties, matchedFeature.properties);
      
        matchedLines.push(matchedFeature);
    }
    else {
      unmatchedLines.push(line);
    }
  }

  if(matchedLines.length) {
    console.log(chalk.bold.keyword('blue')('  ✏️  Writing ' + matchedLines.length + ' matched lines: ' + outFile + ".matched.geojson"));
    var matchedFeatureCollection:turfHelpers.FeatureCollection<turfHelpers.LineString> = turfHelpers.featureCollection(matchedLines);
    var matchedJsonOut = JSON.stringify(matchedFeatureCollection);
    writeFileSync(outFile + ".matched.geojson", matchedJsonOut);
  }

  if(unmatchedLines.length ) {
    console.log(chalk.bold.keyword('blue')('  ✏️  Writing ' + unmatchedLines.length + ' unmatched lines: ' + outFile + ".unmatched.geojson"));
    var unmatchedFeatureCollection:turfHelpers.FeatureCollection<turfHelpers.LineString> = turfHelpers.featureCollection(unmatchedLines);
    var unmatchedJsonOut = JSON.stringify(unmatchedFeatureCollection);
    writeFileSync(outFile + ".unmatched.geojson", unmatchedJsonOut);
  }

}