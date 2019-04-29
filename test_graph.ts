import { lineString } from "@turf/helpers";
import length from "@turf/length";
import * as fs from "fs";
import * as glob from "glob";
import * as path from "path";
import * as sharedstreetsPbf from "sharedstreets-pbf";
import * as sharedstreets from "./src/index";

import * as turfHelpers from '@turf/helpers';
import envelope from '@turf/envelope';


import * as tiles from "./src/tiles";
import { TileIndex } from "./src/tile_index";
import { TilePathGroup, TileType, TilePathParams } from "./src/tiles";
import { Matcher } from "./src/matcher";
import { CleanedPoints, CleanedLines } from "./src/geom";
import { polygon } from "@turf/envelope/node_modules/@turf/helpers";
import { Graph } from "./src/graph";

const test = require('tape');
 
test("graph build", async (t:any) => { 
 
  var params = new TilePathParams();
  params.source = 'osm/planet-180430';
  params.tileHierarchy = 6;

   // test polygon (dc area)
   const content = fs.readFileSync('test/geojson/line_1.in.geojson');
   var lineIn:turfHelpers.FeatureCollection<turfHelpers.LineString> = JSON.parse(content.toLocaleString());
   var graph = new Graph(envelope(lineIn), params);
   await graph.buildGraph();

   t.equal(graph.id, 'd626d5b0-0dec-3e6f-97ff-d9712228a282');

   graph.match(lineIn.features[0]);

   t.end();
 });
