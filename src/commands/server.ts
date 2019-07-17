import {
    omit
} from 'lodash';
import Command from "@oclif/command";
import * as turfHelpers from '@turf/helpers';
import bodyParser from 'body-parser';
import express from 'express';
import Path from 'path';
import { matchLines, MatchDirection } from "./match";
import { Graph, GraphMode, ReferenceSideOfStreet, ReferenceDirection, PathCandidate, PathSegment } from "../graph";
import envelope from "@turf/envelope";
import { TilePathParams } from "../tiles";
import { forwardReference, backReference } from '../index';
import { SharedStreetsReference, SharedStreetsIntersection } from 'sharedstreets-types';

var extentFile = require('/Users/indraneel/sharedstreets/sharedstreets-js/src/extent.json');


export default class Server extends Command {
    static description = "run a local server to access the SharedStreets match tool via a REST API"
    async run(): Promise<any> {
        const matcher = await getMatcher();
        server(matcher);
    }
    
}

async function getMatcher() {
    var params = new TilePathParams();
    // params.source = flags['tile-source'];
    params.source = "osm/planet-181224";
    // params.tileHierarchy = flags['tile-hierarchy']
    params.tileHierarchy = 6;
    const extent = envelope(extentFile);
    const matcher = new Graph(extent, params, GraphMode.CAR_ALL);
    await matcher.buildGraph();
    // console.log("graph built");
    matcher.searchRadius = 25;
    matcher.snapIntersections = true;
    return matcher;
}

const getMatchedSegments = (path:PathCandidate, ref:SharedStreetsReference) => {
    var segmentGeoms = [];
    for(var segment of path.segments) {
        console.log("segment = ", segment);
      var segmentGeom = segment.geometry;
      segmentGeom.properties = omit(segment, 'geometry');
      segmentGeom.properties.direction = path.endPoint.direction;
      segmentGeoms.push(segmentGeom);
    }

    return segmentGeoms;

  };

async function server(matcher: Graph) {
    const corsHeaders = {
        origin: ["*"],
        headers: ['Origin', 'X-Requested-With', 'Content-Type'],
        credentials: true,
        additionalHeaders: ['access-control-allow-headers', 'Access-Control-Allow-Origin, Access-Control-Allow-Headers, Origin, X-Requested-With, Content-Type, CORRELATION_ID'],
        additionalExposedHeaders: ['access-control-allow-headers', 'Access-Control-Allow-Origin, Access-Control-Allow-Headers, Origin, X-Requested-With, Content-Type, CORRELATION_ID']
    };

    const app = express(); 
    app.use(bodyParser.text());
    app.use((req, res, next) => {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    })
    app.post("/match/geoms", async (req, res) => {
        console.log("POST match/geoms,\nrequest:")
        // console.log(req.query);
        // console.log(req.body);
        const query = req.query;
        const body = JSON.parse(req.body);
        // console.log(query);
        // console.log(body);
        // console.log(h);
        // matchLines({}, body, query);
        let matchDirection = MatchDirection.BEST;
        if (query.ignoreDirection) {
            matchDirection = MatchDirection.BOTH;
        }
        var matchedLines:turfHelpers.Feature<turfHelpers.LineString>[] = [];
        var unmatchedLines:turfHelpers.Feature<turfHelpers.LineString>[] = [];
        var matchedLine:boolean = false;
        var matchForward = null;
        var matchForwardSegments = null;
        var matchBackward = null;
        var matchBackwardSegments = null;
        var forwardGisRef:SharedStreetsReference = forwardReference(body);
        var backwardGisRef:SharedStreetsReference = backReference(body);

        matchForward = await matcher.matchGeom(body);
        console.log("matchForward = \n", matchForward);
        if(matchForward && matchForward.score < matcher.searchRadius * 2) {
            matchForwardSegments = getMatchedSegments(matchForward, forwardGisRef);
        }
        matchBackward = await matcher.matchGeom(body);
        // console.log("matchBackward = \n", matchBackward);
        if(matchBackward && matchBackward.score < matcher.searchRadius * 2) {
            matchBackwardSegments = getMatchedSegments(matchBackward, backwardGisRef);
        }

        if (matchDirection === MatchDirection.BEST) {
            if(matchForward && matchBackward) {
                if(matchForward.score > matchBackward.score) {
                    matchedLines = matchedLines.concat(matchForwardSegments);
                  matchedLine = true;
                }
                else if(matchForward.score == matchBackward.score) {
                  if(query.leftSideDriving) {
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
        } else {
            if(matchForwardSegments) {
                matchedLines = matchedLines.concat(matchForwardSegments);
                matchedLine = true;
            }
        
            if(matchBackwardSegments) {
                matchedLines = matchedLines.concat(matchBackwardSegments);
                matchedLine = true;
            }
        }

        if (!matchedLine) {
            unmatchedLines.push(body);
        }
        
        const output = {
            matched: {},
            invalid: {},
            unmatched: {},
        };

        if(matchedLines && matchedLines.length) {
            var matchedFeatureCollection:turfHelpers.FeatureCollection<turfHelpers.LineString> = turfHelpers.featureCollection(matchedLines);
            output.matched = matchedFeatureCollection;
        }

        if (unmatchedLines && unmatchedLines.length > 0) {
            var unmatchedFeatureCollection:turfHelpers.FeatureCollection<turfHelpers.LineString> = turfHelpers.featureCollection(unmatchedLines);
            output.unmatched = unmatchedFeatureCollection;
        }

        res.end(JSON.stringify(output));
    });
    app.listen(3001, () =>  {
        console.log('Server running at: http://localhost:3001/');
    });
}