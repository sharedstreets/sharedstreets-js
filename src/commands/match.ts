import {Command, flags} from '@oclif/command'
import { readFileSync, writeFileSync, existsSync } from 'fs';

import { TilePathParams, TileType, TilePathGroup } from '../tiles'

import { TileIndex } from '../tile_index'
import { PointMatcher } from '../point_matcher'


import * as turfHelpers from '@turf/helpers';

import { CleanedLines, reverseLineString } from '../geom';
import { Graph, PathCandidate } from '../graph';
import  envelope from '@turf/envelope';
import { Feature, LineString } from '@turf/buffer/node_modules/@turf/helpers';

const chalk = require('chalk');
const cliProgress = require('cli-progress');

function mapOgProperties(og_props:{}, new_props:{}) {
  for(var prop of Object.keys(og_props)) {
    new_props['pp_' + prop] = og_props[prop];
    //console.log(new_props)
  }
}

export default class Match extends Command {
  static description = 'matches point and line features to sharedstreets refs'

  static examples = [
    `$ shst match points.geojson --out=matched_points.geojson --port-properties
  🌏  Loading points...
  ✨  Matching 3 points...
  🎉  Matched 2 points... (1 unmached)
    `,
  ]

  static flags = {
    help: flags.help({char: 'h'}),

    // flag with a value (-o, --out=FILE)
    out: flags.string({char: 'o', description: 'file output name creates files [file-output-name].matched.geojson and [file-output-name].unmatched.geojson'}),
    'skip-port-properties': flags.boolean({char: 'p', description: 'skip porting existing feature properties preceeded by "pp_"', default: false}),
    'follow-line-direction': flags.boolean({description: 'only match using line direction', default: false}),
    'direction-field': flags.string({description: 'name of optional line properity describing segment directionality, use the related "oneway-*-value" and "twoway-value" properities'}),
    'oneway-with-direction-value': flags.string({description: 'name of optional value of "oneway-field" indicating a oneway street with line direction'}),
    'oneway-against-direction-value': flags.string({description: 'name of optional value of "oneway-field" indicating a oneway street against line direction'}),
    'twoway-value': flags.string({description: 'name of optional value of "oneway-field" indicating a oneway street'}),
    'bearing-field': flags.string({description: 'name of optional point property containing bearing in decimal degrees', default:'bearing'}),
    'search-radius': flags.integer({description: 'search radius for for snapping points, lines and traces', default:10}),
    'snap-intersections': flags.boolean({description: 'snap line end-points to nearest intersection', default:false}),
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


    if(flags['direction-field'])
      console.log(chalk.bold.keyword('green')('  Filtering oneway and twoway streets using field "' + flags['direction-field'] + '" with values: ' + ' "' + flags['oneway-with-direction-value'] + '", "' + flags['oneway-against-direction-value'] + '", "' +  flags['twoway-value'] + '"'));
    
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
  matcher.searchRadius = flags['search-radius'];
  var matchedPoints:turfHelpers.Feature<turfHelpers.Point>[] = [];
  var unmatchedPoints:turfHelpers.Feature<turfHelpers.Point>[] = [];

  for(var searchPoint of points.features) {

    var bearing:number =null;
    if(searchPoint.properties && searchPoint.properties[flags['bearing-field']])
      bearing = parseFloat(searchPoint.properties[flags['bearing-field']]);

    var matches = await matcher.getPointCandidates(searchPoint, bearing, 3);
    if(matches.length > 0) {
      var matchedFeature = matches[0].toFeature();
      
      if(!flags['skip-port-properties'])
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

enum MatchDirection {
  FORWARD, 
  BACKWARD,
  BOTH
}

async function matchLines(outFile, params, lines, flags) {

  var cleanedlines = new CleanedLines(lines);
  
  console.log(chalk.bold.keyword('green')('  ✨  Matching ' + cleanedlines.clean.length + ' lines...'));
  
  var extent = envelope(lines);
  var matcher = new Graph(extent, params);
  await matcher.buildGraph();

  if(flags['search-radius'])
    matcher.searchRadius = flags['search-radius'];

  matcher.snapIntersections = flags['snap-intersections'];

  var matchedLines:turfHelpers.Feature<turfHelpers.LineString>[] = [];
  var unmatchedLines:turfHelpers.Feature<turfHelpers.LineString>[] = [];

  const bar1 = new cliProgress.Bar({},{
    format: chalk.keyword('blue')(' {bar}') + ' {percentage}% | {value}/{total} ',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591'
  });
 
  bar1.start(cleanedlines.clean.length, 0);

  for(var line of cleanedlines.clean) {

    const applyProperties = (path:PathCandidate, originalFeature:Feature<LineString>) => {
      path.matchedPath.properties['segments'] =  path.segments;
      path.matchedPath.properties['score'] = path.score;
      path.matchedPath.properties['matchType'] = path.matchType;
      
      if(!flags['skip-port-properties'])
        mapOgProperties(originalFeature.properties, path.matchedPath.properties);

      return path.matchedPath;
    }

    var matchDirection:MatchDirection;
    if(flags['direction-field'] && line.properties[flags['direction-field'].toLocaleLowerCase()]) {

      var lineDirectionValue =  '' + line.properties[flags['direction-field'].toLocaleLowerCase()];

      if(lineDirectionValue == '' + flags['oneway-with-direction-value']) {
        matchDirection = MatchDirection.FORWARD;
      }
      else if(lineDirectionValue == '' + flags['oneway-against-direction-value']) {
        matchDirection = MatchDirection.BACKWARD;
      }
      else if(lineDirectionValue == '' + flags['twoway-value']) {
        matchDirection = MatchDirection.BOTH;
      } 
      else {
        // TODO handle lines that don't match rules
        matchDirection = MatchDirection.BOTH;
      }
    }
    else if (flags['follow-line-direction']) {
      matchDirection = MatchDirection.FORWARD;
    }
    else {
      matchDirection = MatchDirection.BOTH;
    }
    
    var matchedOneDirection:boolean = false;
    if(matchDirection == MatchDirection.FORWARD || matchDirection == MatchDirection.BOTH) {
      var matchForward = await matcher.match(line);
      if(matchForward) {
        var matchedLine = <turfHelpers.Feature<LineString>>applyProperties(matchForward, line);
        matchedLines.push(matchedLine);
        matchedOneDirection=true;
      }
    }
    
    if(matchDirection == MatchDirection.BACKWARD || matchDirection == MatchDirection.BOTH) {
      var reversedLine = <turfHelpers.Feature<LineString>>reverseLineString(line);
      var matchBackward = await matcher.match(reversedLine);
      if(matchBackward) {
          var matchedLine = <turfHelpers.Feature<LineString>>applyProperties(matchBackward, reversedLine);
          matchedLines.push(matchedLine);
          matchedOneDirection=true;
      }
    }
    
    if(!matchedOneDirection)
      unmatchedLines.push(line);
  

    bar1.increment();
  }
  bar1.stop();

  if(matchedLines && matchedLines.length) {
    console.log(chalk.bold.keyword('blue')('  ✏️  Writing ' + matchedLines.length + ' matched edges: ' + outFile + ".matched.geojson"));
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

// var content = readFileSync('tmp/HERE_intersection_test.js');
// var data:turfHelpers.FeatureCollection<turfHelpers.Geometry> = JSON.parse(content.toLocaleString());

// var params = new TilePathParams();
// params.source = 'osm/planet-181224';
// params.tileHierarchy = 6

// //matchLines('tmp/HERE_intersection_test.js.out', params, data, {});
// var content = readFileSync('tmp/sf_centerlines.geojson');
// var data:turfHelpers.FeatureCollection<turfHelpers.Geometry> = JSON.parse(content.toLocaleString());


// if(data.features[0].geometry.type  === 'LineString' || data.features[0].geometry.type  === 'MultiLineString') {
// matchLines('tmp/sf_centerlines.geojson.out', params, data, {'direction-field':'oneway', 'twoway-value':'B','oneway-with-direction-value':'F', 'oneway-against-direction-value':'T'});
// }