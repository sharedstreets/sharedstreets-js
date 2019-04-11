import {Command, flags} from '@oclif/command'
import { readFileSync, writeFileSync, existsSync } from 'fs';

import { TilePathParams, TileType, TilePathGroup } from '../tiles'

import { TileIndex } from '../tile_index'
import { PointMatcher } from '../point_matcher'


import * as turfHelpers from '@turf/helpers';

import { CleanedLines } from '../geom';
import { Graph } from '../graph';
import  envelope from '@turf/envelope';

const chalk = require('chalk');
const cliProgress = require('cli-progress');

function mapOgProperties(og_props:{}, new_props:{}) {
  for(var prop of Object.keys(og_props)) {
    new_props['og_' + prop] = og_props[prop];
    //console.log(new_props)
  }
}

export default class Match extends Command {
  static description = 'matches point and line features to sharedstreets refs'

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
    'port-properties': flags.boolean({char: 'p', description: 'port existing feature properties preceeded by "pp_"', default: true}),
    'to-field': flags.string({description: 'name of optional line properity describing "to" intersection id, releative to line direction'}),
    'from-field': flags.string({description: 'name of optional line properity describing "from" intersection id, releative to line direction'}),
    'oneway-field': flags.string({description: 'name of optional line properity describing "one-way" segments, use the related "oneway-value"'}),
    'oneway-value': flags.string({description: 'name of optional value of "oneway-field" indicating a oneway street'}),
    'bearing-field': flags.string({description: 'name of optional point property containing bearing in decimal degrees', default:'bearing'}),
    stats: flags.boolean({char: 's'})

    // flag with no value (-f, --force)
    //force: flags.boolean({char: 'f'}),
  }

  static args = [{name: 'file'}]

  async run() {

    const {args, flags} = this.parse(Match)

    this.log(chalk.bold.keyword('green')('  🌏  Loading geojson data...'));

    var inFile = args.file;

    var outFile = flags.out;

    if(!inFile || !existsSync(inFile)) {
      this.log(chalk.bold.keyword('orange')('  💾  Input file not found...'));
      return;
    }

    if(!outFile) 
      outFile = inFile;

    if(outFile.toLocaleLowerCase().endsWith(".geojson")  || outFile.toLocaleLowerCase().endsWith(".geojson"))
      outFile = outFile.split(".").slice(0, -1).join(".");

    var content = readFileSync(inFile);
    var data:turfHelpers.FeatureCollection<turfHelpers.Geometry> = JSON.parse(content.toLocaleString());
  
    var params = new TilePathParams();
    params.source = 'osm/planet-181224';
    params.tileHierarchy = 6

    if(data.features[0].geometry.type  === 'LineString' || data.features[0].geometry.type  === 'MultiLineString') {
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
  
  var matcher = new PointMatcher(null, params);

  var matchedPoints:turfHelpers.Feature<turfHelpers.Point>[] = [];
  var unmatchedPoints:turfHelpers.Feature<turfHelpers.Point>[] = [];

  for(var searchPoint of points.features) {

    var bearing:number =null;
    if(searchPoint.properties && searchPoint.properties[flags['bearing-field']])
      bearing = parseFloat(searchPoint.properties[flags['bearing-field']]);

    var matches = await matcher.getPointCandidates(searchPoint, bearing, 3);
    if(matches.length > 0) {
      var matchedFeature = matches[0].toFeature();
      
      if(flags['port-properties'])
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

  var cleanedlines = new CleanedLines(lines);
  
  console.log(chalk.bold.keyword('green')('  ✨  Matching ' + cleanedlines.clean.length + ' lines...'));
  
  var extent = envelope(lines);
  var matcher = new Graph(extent, params);

  var matchedLines:turfHelpers.Feature<turfHelpers.LineString>[] = [];
  var unmatchedLines:turfHelpers.Feature<turfHelpers.LineString>[] = [];

  const bar1 = new cliProgress.Bar({},{
    format: chalk.keyword('blue')(' {bar}') + ' {percentage}% | {value}/{total} ',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591'
  });
 
  bar1.start(cleanedlines.clean.length, 0);

  for(var line of cleanedlines.clean) {

    var bearing:number =null;
  
    var matches1 = await matcher.match(line);

    line.geometry.coordinates.reverse()
    var matches2 = await matcher.match(line);
    
    var bestMatch = null;
    if(matches1 && matches2 ) {
      if(matches1.score > matches2.score)
        bestMatch = matches1;
      else 
        bestMatch = matches2;
    }
    else if(matches1) {
      bestMatch = matches1;
    }
    else if(matches2) {
      bestMatch = matches2;
    }

    if(bestMatch && bestMatch.matchedPath) {      
        bestMatch.matchedPath.properties['segments'] =  bestMatch.segments;
        bestMatch.matchedPath.properties['score'] = bestMatch.score;
        bestMatch.matchedPath.properties['matchType'] = bestMatch.matchType;
       
        if(flags['port-properties'])
          mapOgProperties(line.properties, bestMatch.matchedPath.properties);
       
        matchedLines.push(bestMatch.matchedPath);
    }
    else {
      unmatchedLines.push(line);
    }

    bar1.increment();
  }
  bar1.stop();

  if(matchedLines && matchedLines.length) {
    console.log(chalk.bold.keyword('blue')('  ✏️  Writing ' + matchedLines.length + ' matched lines: ' + outFile + ".matched.geojson"));
    var matchedFeatureCollection:turfHelpers.FeatureCollection<turfHelpers.LineString> = turfHelpers.featureCollection(matchedLines);
    var matchedJsonOut = JSON.stringify(matchedFeatureCollection);
    writeFileSync(outFile + ".matched.geojson", matchedJsonOut);
  }

  if(unmatchedLines && unmatchedLines.length ) {
    console.log(chalk.bold.keyword('blue')('  ✏️  Writing ' + unmatchedLines.length + ' unmatched lines: ' + outFile + ".unmatched.geojson"));
    var unmatchedFeatureCollection:turfHelpers.FeatureCollection<turfHelpers.LineString> = turfHelpers.featureCollection(unmatchedLines);
    var unmatchedJsonOut = JSON.stringify(unmatchedFeatureCollection);
    writeFileSync(outFile + ".unmatched.geojson", unmatchedJsonOut);
  }

  if(cleanedlines.invalid && cleanedlines.invalid.length ) {
    console.log(chalk.bold.keyword('blue')('  ✏️  Writing ' + cleanedlines.invalid + ' in lines: ' + outFile + ".invalid.geojson"));
    var invalidFeatureCollection:turfHelpers.FeatureCollection<turfHelpers.LineString> = turfHelpers.featureCollection(cleanedlines.invalid);
    var invalidJsonOut = JSON.stringify(invalidFeatureCollection);
    writeFileSync(outFile + ".unmatched.geojson", invalidJsonOut);
  }

}