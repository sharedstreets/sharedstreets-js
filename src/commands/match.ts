import {Command, flags} from '@oclif/command'
import { readFileSync, writeFileSync, existsSync } from 'fs';

import { TilePathParams, TileType, TilePathGroup } from '../index'
import { TileIndex } from '../index'
import { Graph, PathCandidate, GraphMode, ReferenceSideOfStreet} from '../index';

import * as turfHelpers from '@turf/helpers';

import { CleanedLines, reverseLineString, CleanedPoints } from '../geom';

import  envelope from '@turf/envelope';

import { forwardReference, backReference } from '../index';
import { SharedStreetsReference, SharedStreetsIntersection } from 'sharedstreets-types';
import lineOffset from '@turf/line-offset';

import { getReferenceLength } from '../tile_index';
import { generateBinId, getBinCountFromLength, getBinPositionFromLocation, getBinLength } from '../data';
import { PathSegment } from '../graph';
import { PointCandidate } from '../point_matcher';
import { PathSearch } from '../routing';

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
    'tile-source': flags.string({description: 'SharedStreets tile source', default: 'osm/planet-181224'}),
    'tile-hierarchy': flags.integer({description: 'SharedStreets tile hierarchy', default: 6}),
    'skip-port-properties': flags.boolean({char: 'p', description: 'skip porting existing feature properties preceeded by "pp_"', default: false}),
    'follow-line-direction': flags.boolean({description: 'only match using line direction', default: false}),
    'best-direction': flags.boolean({description: 'only match one direction based on best score', default: false}),
    'direction-field': flags.string({description: 'name of optional line properity describing segment directionality, use the related "one-way-*-value" and "two-way-value" properties'}),
    'one-way-with-direction-value': flags.string({description: 'name of optional value of "direction-field" indicating a one-way street with line direction'}),
    'one-way-against-direction-value': flags.string({description: 'name of optional value of "direction-field" indicating a one-way street against line direction'}),
    'two-way-value': flags.string({description: 'name of optional value of "direction-field" indicating a two-way street'}),
    'bearing-field': flags.string({description: 'name of optional point property containing bearing in decimal degrees', default:'bearing'}),
    'search-radius': flags.integer({description: 'search radius for for snapping points, lines and traces (in meters)', default:10}),
    'snap-intersections': flags.boolean({description: 'snap line end-points to nearest intersection if closer than distance defined by search-radius ', default:false}),
    'left-side-driving': flags.boolean({description: 'snap line to side of street using left-side driving rules', default:false}),
    'match-car': flags.boolean({description: 'match using car routing rules', default:true}),
    'match-bike': flags.boolean({description: 'match using bike routing rules', default:false}),
    'match-pedestrian': flags.boolean({description: 'match using pedestrian routing rules', default:false}),
    'match-motorway-only': flags.boolean({description: 'only match against motorway segments', default:false}),
    'match-surface-streets-only': flags.boolean({description: 'only match against surface street segments', default:false}),
    'offset-line': flags.integer({description: 'offset geometry based on direction of matched line (in meters)'}),
    'cluster-points': flags.integer({description: 'aproximate sub-segment length for clustering points (in meters)'}),
    
    'buffer-points': flags.boolean({description: 'buffer points into segment-snapped line segments'}),
    'buffer-points-length': flags.integer({description: 'length of buffered point (in meters)', default:5}),
    'buffer-points-length-field': flags.string({description: 'name of property containing buffered points (in meters)', default:'length'}),
    'buffer-intersection-offset': flags.integer({description: 'offset buffered points from intersection (in meters)', default:0}),
    'buffer-merge': flags.boolean({description: 'merge buffered points -- requires related buffer-merge-fields to be defined', default:false}),
    'buffer-merge-match-fields': flags.string({description: 'comma seperated list of fields to match values when merging buffered points', default:''}),
    'buffer-merge-group-fields': flags.string({description: 'comma seperated list of fields to group values when merging buffered points', default:''})
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

    if(outFile.toLocaleLowerCase().endsWith(".geojson"))
      outFile = outFile.split(".").slice(0, -1).join(".");


    if(flags['direction-field'])
      console.log(chalk.bold.keyword('green')('       Filtering one-way and two-way streets using field "' + flags['direction-field'] + '" with values: ' + ' "' + flags['one-way-with-direction-value'] + '", "' + flags['one-way-against-direction-value'] + '", "' +  flags['two-way-value'] + '"'));
    
    if(flags['match-bike'] || flags['match-pedestrian']) {
      if(flags['match-bike']) {
        console.log(chalk.bold.keyword('green')('       Matching using bike routing rules'));
      }
      if(flags['match-pedestrian']) {
        console.log(chalk.bold.keyword('green')('       Matching using pedestrian routing rules'));
      }
      if(flags['match-motorway-only'])
        console.log(chalk.bold.keyword('orange')('       Ignoring motorway-only setting'));
    }
    else if(flags['match-car']) {
      if(flags['match-motorway-only'])
        console.log(chalk.bold.keyword('green')('       Matching using car routing rules on motorways only'));
      else if(flags['match-surface-only'])
        console.log(chalk.bold.keyword('green')('       Matching using car routing rules on surface streets only'));
      else 
        console.log(chalk.bold.keyword('green')('       Matching using car routing rules on all streets')); 
    }


    var content = readFileSync(inFile);
    var data:turfHelpers.FeatureCollection<turfHelpers.Geometry> = JSON.parse(content.toLocaleString());
  
    var params = new TilePathParams();
    params.source = flags['tile-source'];
    params.tileHierarchy = flags['tile-hierarchy']

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
  
  var cleanPoints = new CleanedPoints(points)

  var graph:Graph = new Graph(null, params);

  if(flags['snap-intersections'])
    graph.tileIndex.addTileType(TileType.INTERSECTION);
  
  graph.searchRadius = flags['search-radius'];
  var unmatchedPoints:turfHelpers.Feature<turfHelpers.Point>[] = [];


  const bar2 = new cliProgress.Bar({},{
    format: chalk.keyword('blue')(' {bar}') + ' {percentage}% | {value}/{total} ',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591'
  });
 
  bar2.start(points.features.length, 0);

  class MatchedPointType {originalFeature:turfHelpers.Feature<turfHelpers.Point>; matchedPoint:PointCandidate; bufferedPoint:PathSegment};

  var matchedPoints:MatchedPointType[] = [];
  
  for(var searchPoint of cleanPoints.clean) {

    var bearing:number =null;
    if(searchPoint.properties && searchPoint.properties[flags['bearing-field']])
      bearing = parseFloat(searchPoint.properties[flags['bearing-field']]);

    var matches = await graph.matchPoint(searchPoint, bearing, 3, flags['left-side-driving']);
    if(matches.length > 0) {
      var matchedPoint:MatchedPointType = new MatchedPointType(); 
      matchedPoint.matchedPoint = matches[0];
      matchedPoint.originalFeature = searchPoint;
      matchedPoints.push(matchedPoint);

    }
    else {
      unmatchedPoints.push(searchPoint);
    }
    bar2.increment();
  }
  bar2.stop();

  var clusteredPoints = [];
  var bufferedPoints = [];
  var bufferedMergedPoints = [];
  var intersectionClusteredPoints = [];
  var mergedPoints = [];

  if(flags['cluster-points']) {
    var clusteredPointMap = {};
    var intersectionClusteredPointMap = {};
    
    const mergePointIntoCluster = (matchedPoint:MatchedPointType) => {

      var pointGeom = null;
      if(flags['snap-intersections'] && 
        ( matchedPoint.matchedPoint.location <= flags['search-radius'] ||
          matchedPoint.matchedPoint.referenceLength - matchedPoint.matchedPoint.location <= flags['search-radius'])) {
          
        var reference = <SharedStreetsReference>graph.tileIndex.objectIndex.get(matchedPoint.matchedPoint.referenceId);
        var intersectionId;

        if(matchedPoint.matchedPoint.location <= flags['search-radius']) {
          intersectionId = reference.locationReferences[0].intersectionId;
        }
        else if(matchedPoint.matchedPoint.referenceLength - matchedPoint.matchedPoint.location <= flags['search-radius']) {
          intersectionId = reference.locationReferences[reference.locationReferences.length-1].intersectionId;
        }

        if(intersectionClusteredPointMap[intersectionId]) {
          pointGeom = intersectionClusteredPointMap[intersectionId];
          pointGeom.properties['count'] += 1;
        }
        else {
          pointGeom = JSON.parse(JSON.stringify(graph.tileIndex.featureIndex.get(intersectionId)));
          var intersection = <SharedStreetsIntersection>graph.tileIndex.objectIndex.get(intersectionId);

          delete pointGeom.properties["id"];
          pointGeom.properties["intersectionId"] = intersectionId;

          var inboundCount = 1;
          for(var inboundRefId of intersection.inboundReferenceIds) {
            pointGeom.properties["inboundReferenceId_" + inboundCount] = inboundRefId;
            inboundCount++;
          }

          var outboundCount = 1;
          for(var outboundRefId of intersection.outboundReferenceIds) {
            pointGeom.properties["outboundReferenceId_" + outboundCount] = outboundRefId;
            outboundCount++;
          }

          pointGeom.properties['count'] = 1;

          intersectionClusteredPointMap[intersectionId] = pointGeom;
        }

      }
      else {

        var binCount = getBinCountFromLength(matchedPoint.matchedPoint.referenceLength, flags['cluster-points'])
        var binPosition = getBinPositionFromLocation(matchedPoint.matchedPoint.referenceLength, flags['cluster-points'], matchedPoint.matchedPoint.location);
        var binId = generateBinId(matchedPoint.matchedPoint.referenceId, binCount, binPosition);
        var binLength = getBinLength(matchedPoint.matchedPoint.referenceLength, flags['cluster-points'])

        if(clusteredPointMap[binId]) {
          clusteredPointMap[binId].properties['count'] += 1;
        }
        else {
          var bins = graph.tileIndex.referenceToBins(matchedPoint.matchedPoint.referenceId, binCount, 2, ReferenceSideOfStreet.RIGHT);
          var binPoint = turfHelpers.point(bins.geometry.coordinates[binPosition - 0]);
          binPoint.properties['id'] = binId;
          binPoint.properties['referenceId'] = matchedPoint.matchedPoint.referenceId;
          binPoint.properties['binPosition'] = binPosition;
          binPoint.properties['binCount'] = binCount;
          binPoint.properties['binLength'] = binLength;
          binPoint.properties['count'] = 1;
          clusteredPointMap[binId] = binPoint;
        }

        pointGeom = clusteredPointMap[binId];
      }

      for(var property of Object.keys(matchedPoint.originalFeature.properties)) {
        if(property.startsWith('pp_')) {
          if(!isNaN(matchedPoint.originalFeature.properties[property])) { 
            var sumPropertyName = 'sum_' +  property;
            if(!pointGeom.properties[sumPropertyName]) {
              pointGeom.properties[sumPropertyName] = 0;
            }
            pointGeom.properties[sumPropertyName] += matchedPoint.originalFeature.properties[property];
          }
        }
      }
    };

    for(var matchedPoint of matchedPoints) {
      mergePointIntoCluster(matchedPoint);
    }

    intersectionClusteredPoints = Object.keys(intersectionClusteredPointMap).map(key => intersectionClusteredPointMap[key]);
    clusteredPoints = Object.keys(clusteredPointMap).map(key => clusteredPointMap[key]);
  }

  if(flags['buffer-points']) {

    class MergeBufferedPointsType {mergedPathSegments:PathSegment; matchedPoints:MatchedPointType[]};
    
    console.log(chalk.bold.keyword('green')('  ✨  Buffering ' + matchedPoints.length + ' matched points...'));
  
    var bufferLength = flags['buffer-points-length'];
    console.log(chalk.bold.keyword('green')('        default buffer length: ' + bufferLength));

    var bufferLengthFieldName = null;
    if(flags['buffer-points-length-field']) {
      bufferLengthFieldName = flags['buffer-points-length-field'].toLocaleLowerCase().trim().replace(/ /g, "_");
      console.log(chalk.bold.keyword('green')('        buffer length fieldname: ' + bufferLengthFieldName));
    }
      bufferLengthFieldName = flags['buffer-points-length-field'].toLocaleLowerCase().trim().replace(/ /g, "_");

    for(var matchedPoint of matchedPoints) {

      var offsetLine:number = flags['offset-line'];
      var leftSideDriving:boolean = flags['left-side-driving'];

      if(offsetLine) {
        if(leftSideDriving) {
          if(matchedPoint.matchedPoint.sideOfStreet === ReferenceSideOfStreet.LEFT) {
            offsetLine = offsetLine;
          }
          else if(matchedPoint.matchedPoint.sideOfStreet === ReferenceSideOfStreet.RIGHT) {
            offsetLine = 0 - offsetLine;
          }
        }
        else {
          if(matchedPoint.matchedPoint.sideOfStreet === ReferenceSideOfStreet.RIGHT) {
            offsetLine = offsetLine;
          }
          else if(matchedPoint.matchedPoint.sideOfStreet === ReferenceSideOfStreet.LEFT) {
            offsetLine = 0 - offsetLine;
          }
        }
      }

      var pointBufferLength = bufferLength;

      if(bufferLengthFieldName && matchedPoint.originalFeature.properties.hasOwnProperty(bufferLengthFieldName))
        pointBufferLength = matchedPoint.originalFeature.properties[bufferLengthFieldName];

      matchedPoint.bufferedPoint = await graph.bufferPoint(matchedPoint.matchedPoint, pointBufferLength, offsetLine);
      var bufferedFeature = matchedPoint.bufferedPoint.toFeature();
      mapOgProperties(matchedPoint.originalFeature.properties, bufferedFeature.properties);
      bufferedPoints.push(bufferedFeature);
    }  

    if(flags['buffer-merge']) {

      console.log(chalk.bold.keyword('green')('  ✨  Merging ' + bufferedPoints.length + ' buffered points...'));

      var bufferedPreMergedPoints:Map<string,Array<MatchedPointType>> = new Map();

      var mergeFields:string[] = [];
      if(flags['buffer-merge-match-fields']) {
        // split and clean property fields
        mergeFields = flags['buffer-merge-match-fields'].split(",").map((f) =>{return f.toLocaleLowerCase().replace(/ /g, "_")});
        mergeFields.sort();
        console.log(chalk.bold.keyword('green')('        merging on fields: ' + mergeFields.join(', ')));
      }
      
      var groupFields:string[] = [];
      if(flags['buffer-merge-group-fields']) {
        // split and clean property fields
        groupFields = flags['buffer-merge-group-fields'].split(",").map((f) =>{return f.toLocaleLowerCase().replace(/ /g, "_")});
        groupFields.sort();
        console.log(chalk.bold.keyword('green')('        grouping on field values: ' + groupFields.join(', ')));
      }
      
      for(var matchedPoint of matchedPoints) {

        var fieldValues:string[] = [];
        for(var mergeField of mergeFields) {
          if(matchedPoint.originalFeature.properties.hasOwnProperty(mergeField)){
            fieldValues.push((mergeField + ':' + matchedPoint.originalFeature.properties[mergeField]).toLocaleLowerCase().trim().replace(/ /g, "_")) 
          }
        }
        var fieldValuesString = fieldValues.join(':');

        var refSideHash = matchedPoint.bufferedPoint.referenceId + ':' + matchedPoint.bufferedPoint.sideOfStreet + ':' + fieldValuesString;
      
        if(!bufferedPreMergedPoints.has(refSideHash)) {
          bufferedPreMergedPoints.set(refSideHash, new Array());
        };

        bufferedPreMergedPoints.get(refSideHash).push(matchedPoint);
      
      }

      const mergeSegments = async (bufferedSegments:MatchedPointType[]):Promise<MergeBufferedPointsType[]> => {

        var mergedSegment = new MergeBufferedPointsType();
        var mergedSegments:MergeBufferedPointsType[] = [];
  
        bufferedSegments

        bufferedSegments.sort((a:MatchedPointType, b:MatchedPointType):number => (a.bufferedPoint.section[0] > b.bufferedPoint.section[0]) ? 11 : -1);
        
        var segment1:MatchedPointType = bufferedSegments.pop();   

        var mergedSegment = new MergeBufferedPointsType();
        mergedSegment.mergedPathSegments = segment1.bufferedPoint;
        mergedSegment.matchedPoints = [segment1];
  
        while(segment1 && bufferedSegments.length > 0) {
          var segment2:MatchedPointType = bufferedSegments.pop();

          if(segment2 && mergedSegment.mergedPathSegments.isIntersecting(segment2.bufferedPoint)) {

            var offsetLine:number = flags['offset-line'];
            var leftSideDriving:boolean = flags['left-side-driving'];

            if(offsetLine) {
              if(leftSideDriving) {
                if(mergedSegment.mergedPathSegments.sideOfStreet === ReferenceSideOfStreet.LEFT) {
                  offsetLine = offsetLine;
                }
                else if( mergedSegment.mergedPathSegments.sideOfStreet === ReferenceSideOfStreet.RIGHT) {
                  offsetLine = 0 - offsetLine;
                }
              }
              else {
                if(mergedSegment.mergedPathSegments.sideOfStreet === ReferenceSideOfStreet.RIGHT) {
                  offsetLine = offsetLine;
                }
                else if(mergedSegment.mergedPathSegments.sideOfStreet === ReferenceSideOfStreet.LEFT) {
                  offsetLine = 0 - offsetLine;
                }
              }
            }

            mergedSegment.mergedPathSegments = await graph.union(mergedSegment.mergedPathSegments, segment2.bufferedPoint, offsetLine);
            mergedSegment.matchedPoints.push(segment2);
          }
          else {
            mergedSegments.push(mergedSegment);
            if(segment2) {
              segment1 = segment2;
          
              mergedSegment = new MergeBufferedPointsType()
              mergedSegment.mergedPathSegments = segment1.bufferedPoint;
              mergedSegment.matchedPoints = [segment1];
            }
            else {
              mergedSegment = null;
            }
          } 
        }
        
        if(mergedSegment)
          mergedSegments.push(mergedSegment);
        
        return mergedSegments;
      };

      for(var refSide of bufferedPreMergedPoints.keys()) {
        if(bufferedPreMergedPoints.get(refSide).length > 0) {
          var mergedBuffers:MergeBufferedPointsType[] = await mergeSegments(bufferedPreMergedPoints.get(refSide));
          for(var mergedBuffer of mergedBuffers) {
            var outputBufferedFeature = mergedBuffer.mergedPathSegments.toFeature();           

            for(var mergeField of mergeFields) {
              if(mergedBuffer.matchedPoints[0].originalFeature.properties.hasOwnProperty(mergeField)){
                outputBufferedFeature.properties['pp_' + mergeField] = mergedBuffer.matchedPoints[0].originalFeature.properties[mergeField];
              }
            }            

            for(var groupField of groupFields) {
              var groupedFieldValues = []
              for( var point of mergedBuffer.matchedPoints) {          
                if(point.originalFeature.properties.hasOwnProperty(groupField)){
                  groupedFieldValues.push(point.originalFeature.properties[groupField]);
                }
              }
              outputBufferedFeature.properties['pp_' + groupField] = groupedFieldValues;
            } 
            
            outputBufferedFeature.properties['shst_merged_point_count'] = mergedBuffer.matchedPoints.length;
            var mergedBufferLength = 0;
            for( var point of mergedBuffer.matchedPoints) {
              mergedBufferLength += point.bufferedPoint.section[1] - point.bufferedPoint.section[0];
            }
            outputBufferedFeature.properties['shst_merged_buffer_length'] = mergedBufferLength;

            bufferedMergedPoints.push(outputBufferedFeature);
          }
          
        }
      }
    }
  }

  if(matchedPoints.length) {
    console.log(chalk.bold.keyword('blue')('  ✏️  Writing ' + matchedPoints.length + ' matched points: ' + outFile + ".matched.geojson"));
    var featureArray = []
    for(var matchedPoint of matchedPoints) {
      featureArray.push(matchedPoint.matchedPoint.toFeature());
    }
    
    var matchedFeatureCollection:turfHelpers.FeatureCollection<turfHelpers.Point> = turfHelpers.featureCollection(featureArray);
    var matchedJsonOut = JSON.stringify(matchedFeatureCollection);
    writeFileSync(outFile + ".matched.geojson", matchedJsonOut);
  }

  if(clusteredPoints.length) {
    console.log(chalk.bold.keyword('blue')('  ✏️  Writing ' + clusteredPoints.length + ' clustered points: ' + outFile + ".clustered.geojson"));
    var clusteredPointsFeatureCollection:turfHelpers.FeatureCollection<turfHelpers.Point> = turfHelpers.featureCollection(clusteredPoints);
    var clusteredJsonOut = JSON.stringify(clusteredPointsFeatureCollection);
    writeFileSync(outFile + ".clustered.geojson", clusteredJsonOut);
  }

  if(bufferedPoints.length) {
    console.log(chalk.bold.keyword('blue')('  ✏️  Writing ' + bufferedPoints.length + ' buffered points: ' + outFile + ".buffered.geojson"));
    var bufferedPointsFeatureCollection:turfHelpers.FeatureCollection<turfHelpers.LineString> = turfHelpers.featureCollection(bufferedPoints);
    var bufferedJsonOut = JSON.stringify(bufferedPointsFeatureCollection);
    writeFileSync(outFile + ".buffered.geojson", bufferedJsonOut);
  }

  if(bufferedMergedPoints.length) {
    console.log(chalk.bold.keyword('blue')('  ✏️  Writing ' + bufferedMergedPoints.length + ' buffered and merged points: ' + outFile + ".buffered.merged.geojson"));
    var bufferedMergedPointsFeatureCollection:turfHelpers.FeatureCollection<turfHelpers.LineString> = turfHelpers.featureCollection(bufferedMergedPoints);
    var bufferedMergedJsonOut = JSON.stringify(bufferedMergedPointsFeatureCollection);
    writeFileSync(outFile + ".buffered.merged.geojson", bufferedMergedJsonOut);
  }

  if(intersectionClusteredPoints.length) {
    console.log(chalk.bold.keyword('blue')('  ✏️  Writing ' + intersectionClusteredPoints.length + ' intersection clustered points: ' + outFile + ".intersection_clustered.geojson"));
    var intersectionClusteredPointsFeatureCollection:turfHelpers.FeatureCollection<turfHelpers.Point> = turfHelpers.featureCollection(intersectionClusteredPoints);
    var intersectionClusteredJsonOut = JSON.stringify(intersectionClusteredPointsFeatureCollection);
    writeFileSync(outFile + ".intersection_clustered.geojson", intersectionClusteredJsonOut);
  }

  if(unmatchedPoints.length ) {
    console.log(chalk.bold.keyword('blue')('  ✏️  Writing ' + unmatchedPoints.length + ' unmatched points: ' + outFile + ".unmatched.geojson"));
    var unmatchedFeatureCollection:turfHelpers.FeatureCollection<turfHelpers.Point> = turfHelpers.featureCollection(unmatchedPoints);
    var unmatchedJsonOut = JSON.stringify(unmatchedFeatureCollection);
    writeFileSync(outFile + ".unmatched.geojson", unmatchedJsonOut);
  }

  if(cleanPoints.invalid  && cleanPoints.invalid.length > 0 ) {
    console.log(chalk.bold.keyword('blue')('  ✏️  Writing ' + cleanPoints.invalid.length + ' invalid points: ' + outFile + ".invalid.geojson"));
    var invalidJsonOut = JSON.stringify(cleanPoints.invalid );
    writeFileSync(outFile + ".unmatched.geojson", invalidJsonOut);
  }
}

enum MatchDirection {
  FORWARD, 
  BACKWARD,
  BOTH,
  BEST
}

async function matchLines(outFile, params, lines, flags) {

  var cleanedlines = new CleanedLines(lines);
  
  console.log(chalk.bold.keyword('green')('  ✨  Matching ' + cleanedlines.clean.length + ' lines...'));
  
  const getMatchedPath = (path:PathCandidate) => {
    path.matchedPath.properties['segments'] =  path.segments;
    path.matchedPath.properties['score'] = path.score;
    path.matchedPath.properties['matchType'] = path.matchType;
    
    if(!flags['skip-port-properties'])
      mapOgProperties(path.originalFeature.properties, path.matchedPath.properties);

    return path.matchedPath;

  }

  const getMatchedSegments = (path:PathCandidate, ref:SharedStreetsReference) => {

    var segmentIndex = 1;

    var segmentGeoms = [];
    for(var segment of path.segments) {

      var segmentGeom = segment.geometry;

      
      segmentGeom.properties = {};

      segmentGeom.properties['shstReferenceId'] = segment.referenceId;
      segmentGeom.properties['shstGeometryId'] = segment.geometryId;
      segmentGeom.properties['shstFromIntersectionId'] = segment.fromIntersectionId;
      segmentGeom.properties['shstToIntersectionId'] = segment.toIntersectionId;

      segmentGeom.properties['gisReferenceId'] = ref.id;
      segmentGeom.properties['gisGeometryId'] = ref.geometryId;
      segmentGeom.properties['gisTotalSegments'] = path.segments.length
      segmentGeom.properties['gisSegmentIndex'] = segmentIndex;
      segmentGeom.properties['gisFromIntersectionId'] = ref.locationReferences[0].intersectionId;
      segmentGeom.properties['gisToIntersectionId'] = ref.locationReferences[ref.locationReferences.length-1].intersectionId;

      segmentGeom.properties['startSideOfStreet'] = path.startPoint.sideOfStreet;
      segmentGeom.properties['endSideOfStreet'] = path.endPoint.sideOfStreet;

      segmentGeom.properties['sideOfStreet'] = path.sideOfStreet;

      if(flags['offset-line']) {
        if(flags['left-side-driving']) {
          if(path.sideOfStreet == ReferenceSideOfStreet.RIGHT)
            segmentGeom = lineOffset(segmentGeom, 0 - flags['offset-line'], {"units":"meters"})
          else if(path.sideOfStreet == ReferenceSideOfStreet.LEFT)
            segmentGeom = lineOffset(segmentGeom, flags['offset-line'], {"units":"meters"})
        }
        else {
          if(path.sideOfStreet == ReferenceSideOfStreet.RIGHT)
            segmentGeom = lineOffset(segmentGeom, flags['offset-line'], {"units":"meters"})
          else if(path.sideOfStreet == ReferenceSideOfStreet.LEFT)
            segmentGeom = lineOffset(segmentGeom, 0 - flags['offset-line'], {"units":"meters"})
        }
      }
        

      segmentGeom.properties['score'] = path.score;
      segmentGeom.properties['matchType'] = path.matchType;

      mapOgProperties(path.originalFeature.properties, segmentGeom.properties);

      segmentGeoms.push(segmentGeom);

      segmentIndex++;
    }

    return segmentGeoms;

  };

  var extent = envelope(lines);
  
  var graphMode:GraphMode;
  if(flags['match-bike'])
    graphMode = GraphMode.BIKE;
  else if(flags['match-pedestrian'])
    graphMode = GraphMode.PEDESTRIAN;
  else if(flags['match-car']) {
    if(flags['match-motorway-only'])
      graphMode = GraphMode.CAR_MOTORWAY_ONLY;
    else if(flags['match-surface-only'])
      graphMode = GraphMode.CAR_SURFACE_ONLY;
    else 
      graphMode = GraphMode.CAR_ALL;
  }
  else 
    graphMode = GraphMode.CAR_ALL;

  var matcher = new Graph(extent, params, graphMode);
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

    if(line.properties['geo_id'] == 30107269)
      console.log('30107269')

    var matchDirection:MatchDirection;
    if(flags['direction-field'] && line.properties[flags['direction-field'].toLocaleLowerCase()] != undefined) {

      var lineDirectionValue =  '' + line.properties[flags['direction-field'].toLocaleLowerCase()];

      if(lineDirectionValue == '' + flags['one-way-with-direction-value']) {
        matchDirection = MatchDirection.FORWARD;
      }
      else if(lineDirectionValue == '' + flags['one-way-against-direction-value']) {
        matchDirection = MatchDirection.BACKWARD;
      }
      else if(lineDirectionValue == '' + flags['two-way-value']) {
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
    else if (flags['best-direction']) {
      matchDirection = MatchDirection.BEST;
    }
    else {
      matchDirection = MatchDirection.BOTH;
    }
    
    var matchForward = null;
    var matchForwardSegments = null;
    if(matchDirection == MatchDirection.FORWARD || matchDirection == MatchDirection.BOTH || matchDirection == MatchDirection.BEST) {

      var gisRef:SharedStreetsReference = forwardReference(line);
			
      matchForward = await matcher.matchGeom(line);
      if(matchForward && matchForward.score < matcher.searchRadius * 2) {
        matchForwardSegments = getMatchedSegments(matchForward, gisRef);
      }
    }
    
    var matchBackward = null;
    var matchBackwardSegments = null;
    if(matchDirection == MatchDirection.BACKWARD || matchDirection == MatchDirection.BOTH || matchDirection == MatchDirection.BEST) {

      var gisRef:SharedStreetsReference = backReference(line);

      var reversedLine = <turfHelpers.Feature<turfHelpers.LineString>>reverseLineString(line);
      matchBackward = await matcher.matchGeom(reversedLine);
      if(matchBackward && matchBackward.score < matcher.searchRadius * 2) {
        matchBackwardSegments = getMatchedSegments(matchBackward, gisRef);
      }
    }
    
    var matchedLine:boolean = false;

    if((matchDirection == MatchDirection.FORWARD || matchDirection == MatchDirection.BOTH) && matchForwardSegments) {
        matchedLines = matchedLines.concat(matchForwardSegments);
      matchedLine = true;
    }

    if((matchDirection == MatchDirection.BACKWARD || matchDirection == MatchDirection.BOTH) && matchBackwardSegments) {
        matchedLines = matchedLines.concat(matchBackwardSegments);
      matchedLine = true;
    }

    if(matchDirection == MatchDirection.BEST) {
      if(matchForward && matchBackward) {
        if(matchForward.score > matchBackward.score) {
            matchedLines = matchedLines.concat(matchForwardSegments);
          matchedLine = true;
        }
        else if(matchForward.score == matchBackward.score) {
          if(flags['left-side-driving']) {
            if(matchForward.sideOfStreet == ReferenceSideOfStreet.LEFT)
              matchedLines = matchedLines.concat(matchForwardSegments);
            else 
              matchedLines = matchedLines.concat(matchBackwardSegments);
          }
          else {
            if(matchForward.sideOfStreet == ReferenceSideOfStreet.RIGHT)
              matchedLines = matchedLines.concat(matchForwardSegments);
            else 
              matchedLines = matchedLines.concat(matchBackwardSegments);
          }
          matchedLine = true;
        }
        else {
            matchedLines = matchedLines.concat(matchBackwardSegments);
          matchedLine = true;
        }
      }
      else if(matchForward) {
          matchedLines = matchedLines.concat(matchForwardSegments);
        matchedLine = true;
      }
      else if(matchBackward) {
          matchedLines = matchedLines.concat(matchBackwardSegments);
        matchedLine = true;
      }
    }
    
    if(!matchedLine)
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
