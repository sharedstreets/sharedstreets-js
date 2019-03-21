import { lineString } from "@turf/helpers";
import length from "@turf/length";
import * as fs from "fs";
import * as glob from "glob";
import * as path from "path";
import * as sharedstreetsPbf from "sharedstreets-pbf";
import * as sharedstreets from "./src/index";

import * as turfHelpers from '@turf/helpers';
import { Polygon } from "@turf/buffer/node_modules/@turf/helpers/lib/geojson";

import * as tiles from "./src/tiles";


const test = require('tape');

const pt1 = [110, 45];
const pt2 = [-74.003388, 40.634538];
const pt3 = [-74.004107, 40.63406];


// core library tests

test("sharedstreets -- intersection", (t:any) => {
  t.equal(sharedstreets.intersectionId(pt1), "afd3db07d9baa6deef7acfcaac240607", "intersectionId => pt1");
  t.equal(sharedstreets.intersectionId(pt2), "f22b51a95400e250bff8d889a738c0b0", "intersectionId => pt2");
  t.equal(sharedstreets.intersectionId(pt3), "eed5479e5315e5a2e71760cc70a4ac76", "intersectionId => pt3");

  t.equal(sharedstreets.intersectionMessage(pt1), "Intersection 110.00000 45.00000", "intersectionMessage => pt1");
  t.equal(sharedstreets.intersectionMessage(pt2), "Intersection -74.00339 40.63454", "intersectionMessage => pt2");
  t.equal(sharedstreets.intersectionMessage(pt3), "Intersection -74.00411 40.63406", "intersectionMessage => pt3");

  // Extras
  t.equal(sharedstreets.intersectionId([-74.00962750000001, 40.740100500000004]), "68ea64a9f5be2b3a219898387b3da3e8", "intersectionId => extra1");
  t.equal(sharedstreets.intersectionMessage([-74.00962750000001, 40.740100500000004]), "Intersection -74.00963 40.74010", "intersectionMessage => extra1");
  t.end();
});

test("sharedstreets -- referenceId", (t:any) => {
  const locationReferenceOutbound = sharedstreets.locationReference([-74.0048213, 40.7416415], {outboundBearing: 208, distanceToNextRef: 9279});
  const locationReferenceInbound = sharedstreets.locationReference([-74.0051265, 40.7408505], {inboundBearing: 188});
  const formOfWay = 2; // => "MultipleCarriageway"

  t.equal(locationReferenceOutbound.intersectionId, "6d9fe428bc29b591ca1830d44e73099d", "locationReferenceOutbound => intersectionId");
  t.equal(locationReferenceInbound.intersectionId, "5a44762edbad541f0fb808c44c018105", "locationReferenceInbound => intersectionId");

  var refHash = sharedstreets.generateHash("Reference 2 -74.00482 40.74164 208 93 -74.00513 40.74085");

  t.equal(sharedstreets.referenceMessage([locationReferenceOutbound, locationReferenceInbound], formOfWay), "Reference 2 -74.00482 40.74164 208 93 -74.00513 40.74085", "referenceId => pt1");
  t.equal(sharedstreets.referenceId([locationReferenceOutbound, locationReferenceInbound], formOfWay), refHash, "referenceId => pt1");
  t.end();
});

test("sharedstreets -- locationReference", (t:any) => {
  const options = {
    distanceToNextRef: 9279,
    outboundBearing: 208,
  };
  const locRef = sharedstreets.locationReference([-74.0048213, 40.7416415], options);

  var intersectionHash = sharedstreets.generateHash("Intersection -74.00482 40.74164");

  t.equal(locRef.intersectionId, intersectionHash, "locRef => intersectionId");
  t.end();
});

test("sharedstreets-pbf -- intersection", (t:any) => {
  var count = 1;
  for(var filepath of glob.sync(path.join('./', "test", "in", `*.intersection.6.pbf`))) {
    const buffer = fs.readFileSync(filepath);
    const intersections = sharedstreetsPbf.intersection(buffer);

    for(var intersection of intersections) {
      count++;
      if(count > 10)
        break;

      const {lon, lat, id, nodeId} = intersection;
      const expectedId = sharedstreets.intersectionId([lon, lat], nodeId);
      const message = sharedstreets.intersectionMessage([lon, lat], nodeId);

      t.equal(expectedId, id, `[${message}] => ${id}`);
    }
  }
  t.end();
});

test("sharedstreets-pbf -- geometry", (t:any) => {
  var count = 1;
  for(var filepath of glob.sync(path.join('./', "test", "in", `*.geometry.6.pbf`))) {

    const buffer = fs.readFileSync(filepath);
    const geometries = sharedstreetsPbf.geometry(buffer);

    for(var geometry of geometries) {
      count++;
      if(count > 10)
        break;

      const {lonlats, id} = geometry;
      const coords = sharedstreets.lonlatsToCoords(lonlats);
      const expectedId = sharedstreets.geometryId(coords);
      const message = sharedstreets.geometryMessage(coords);

      t.equal(expectedId, id, `[${message}] => ${id}`);
    }
  }
  t.end();
});

test("sharedstreets-pbf -- reference", (t:any) => {
  var count = 1;
  for(var filepath of glob.sync(path.join('./', "test", "in", `*.reference.6.pbf`))) {
    const buffer = fs.readFileSync(filepath);
    const references = sharedstreetsPbf.reference(buffer);

    for(var reference of references) {
      count++;
      if(count > 10)
        break;

      const {locationReferences, id, formOfWay} = reference;
      
      const expectedId = sharedstreets.referenceId(locationReferences, formOfWay);
      const message = sharedstreets.referenceMessage(locationReferences, formOfWay);
      
      t.equal(expectedId, id, `["${message}":  ${expectedId}] => ${id}`);
    }
  }
  t.end();
});

test("sharedstreets -- coordsToLonlats", (t:any) => {
  const lonlats = sharedstreets.coordsToLonlats([[110, 45], [120, 55]]);
  t.deepEqual(lonlats, [110, 45, 120, 55]);
  t.end();
});

test("sharedstreets -- geometry", (t:any) => {
  const line = lineString([[110, 45], [115, 50], [120, 55]]);
  const geom = sharedstreets.geometry(line);

  var geomHash = sharedstreets.generateHash("Geometry 110.00000 45.00000 115.00000 50.00000 120.00000 55.00000")

  t.equal(geom.id, geomHash);
  t.end();
});

test("sharedstreets -- intersection", (t:any) => {
  const intersect = sharedstreets.intersection([110, 45]);
  t.deepEqual(intersect, {
    id: "afd3db07d9baa6deef7acfcaac240607",
    lat: 45,
    lon: 110,
    inboundReferenceIds: [],
    outboundReferenceIds: [],
  });
  t.end();
});

test("sharedstreets -- reference", (t:any) => {
  const line = lineString([[110, 45], [115, 50], [120, 55]]);
  const geom = sharedstreets.geometry(line);
  const locationReferences = [
    sharedstreets.locationReference([-74.0048213, 40.7416415], {outboundBearing: 208, distanceToNextRef: 9279}),
    sharedstreets.locationReference([-74.0051265, 40.7408505], {inboundBearing: 188}),
  ];
  const formOfWay = 0; // => "Other"
  const ref = sharedstreets.reference(geom, locationReferences, formOfWay);
  
  const refHash = sharedstreets.generateHash("Reference 0 -74.00482 40.74164 208 93 -74.00513 40.74085");

  t.equal(ref.id, refHash);
  t.end();
});

test("sharedstreets -- metadata", (t:any) => {
  const line = lineString([[110, 45], [115, 50], [120, 55]]);
  const gisMetadata = [{source: "sharedstreets", sections: [{sectionId: "foo", sectionProperties: "bar"}]}];
  const geom = sharedstreets.geometry(line);
  const metadata = sharedstreets.metadata(geom, {}, gisMetadata);

  t.deepEqual(metadata, {
    geometryId: "723cda09fa38e07e0957ae939eb2684f",
    osmMetadata: {},
    gisMetadata: [
      { source: "sharedstreets", sections: [{sectionId: "foo", sectionProperties: "bar"}]},
    ],
  });
  t.end();
});

test("sharedstreets -- getFormOfWay", (t:any) => {
  const lineA = lineString([[110, 45], [115, 50], [120, 55]], {formOfWay: 3});
  const lineB = lineString([[110, 45], [115, 50], [120, 55]]);
  const lineC = lineString([[110, 45], [115, 50], [120, 55]], {formOfWay: "Motorway"});

  t.equal(sharedstreets.getFormOfWay(lineA), 3);
  t.equal(sharedstreets.getFormOfWay(lineB), 0);
  t.equal(sharedstreets.getFormOfWay(lineC), 1);
  t.end();
});

test("sharedstreets -- forwardReference", (t:any) => {
  const line = lineString([[110, 45], [115, 50], [120, 55]]);
  const forwardReference = sharedstreets.forwardReference(line).id;
  const backReference = sharedstreets.backReference(line).id;

  t.equal(forwardReference, "035dc67e1230f1f6c6ec63997f86ba27");
  t.equal(backReference, "21993e8f0cdb8fa629418b78552a4503");
  t.end();
});

test("sharedstreets -- bearing & distance", (t:any) => {
  const line = lineString([[-74.006449, 40.739405000000005], [-74.00790070000001, 40.7393884], [-74.00805100000001, 40.7393804]]);
  const lineLength = length(line);
  const inboundBearing = sharedstreets.inboundBearing(line, lineLength, lineLength);
  const outboundBearing = sharedstreets.outboundBearing(line, lineLength, 0);
  const distanceToNextRef = sharedstreets.distanceToNextRef(line);

  t.equal(outboundBearing, 269); // => 269 Java Implementation
  t.equal(inboundBearing, 269); // => 267 Java Implementation
  t.equal(distanceToNextRef, 13502); // => 13502 Java Implementation
  t.end();
});

test("sharedstreets -- round", (t:any) => {
  t.equal(Number(sharedstreets.round(10.123456789)), 10.12346);
  t.end();
});

test("sharedstreets -- closed loops - Issue #8", (t:any) => {
  // https://github.com/sharedstreets/sharedstreets-conflator/issues/8

  const line = lineString([
    [-79.549159053, 43.615639543],
    [-79.548687537, 43.615687142],
    [-79.547733353, 43.615744613],
    [-79.548036429, 43.614913292],
    [-79.549024608, 43.615542992],
    [-79.549159053, 43.615639543],
  ]);
  t.assert(sharedstreets.forwardReference(line));
  t.assert(sharedstreets.backReference(line));
  t.end();
});


// cache module tests

test("tiles -- generate tile ids ", (t:any) => {

  // test polygon (dc area)
  var poloygon:turfHelpers.Feature<Polygon> = {
    
        "type": "Feature",
        "properties": {},
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [[-77.0511531829834,38.88588861057251],
            [-77.00746536254883, 38.88588861057251],
            [-77.00746536254883, 38.91407701203291],
            [-77.0511531829834, 38.91407701203291],
            [-77.0511531829834,38.88588861057251]]
          ]
        }
      };

  // test tiles for polygon
  var tiles1 = tiles.getTileIdsForPolygon(poloygon);
  t.deepEqual(tiles1, ["12-1171-1566","12-1171-1567"]);
  
  // test buffering
  var tiles2 = tiles.getTileIdsForPolygon(poloygon, 10000);
  t.deepEqual(tiles2, ["12-1170-1566","12-1170-1567","12-1171-1566","12-1171-1567","12-1172-1566","12-1172-1567"]);  

  // test polygon (dc area)
  var point = turfHelpers.point([ -77.0511531829834, 38.88588861057251]);

  // test tiles for point
  var tiles3 = tiles.getTileIdsForPoint(point, 10);
  t.deepEqual(tiles3, ["12-1171-1567"]);

  // test buffering  
  var tiles4 = tiles.getTileIdsForPoint(point, 10000);
  t.deepEqual(tiles4, ["12-1170-1566","12-1170-1567","12-1170-1568","12-1171-1566","12-1171-1567","12-1171-1568","12-1172-1566","12-1172-1567","12-1172-1568"]);  
  
  t.end();
});


test("tiles -- build tile paths ", (t:any) => {

    var pathString =  'osm/planet-180430/12-1171-1566.geometry.6.pbf';
    
    // test path parsing 
    var tilePath = new tiles.TilePath(pathString);
    t.deepEqual(tilePath, {"tileId":"12-1171-1566","tileType":"geometry","source":"osm/planet-180430","tileHierarchy":6});
    
    // test path string builder
    var pathString2 = tilePath.toPathString();
    t.equal(pathString, pathString2);

    // test path group
    var pathGroup = new tiles.TilePathGroup([tilePath]);
    t.deepEqual(pathGroup, { source: 'osm/planet-180430', tileHierarchy: 6, tileType: 'geometry', tileIds: ['12-1171-1566']});

    // test path gruop eumeration
    t.deepEqual([...pathGroup], [{ source: 'osm/planet-180430', tileHierarchy: 6, tileType: 'geometry', tileId: '12-1171-1566' }]);

    t.end();

});

test("tiles -- build tile paths ", async (t:any) => { 
  // get data 
  var tilePath = new tiles.TilePath('osm/planet-180430/12-1171-1566.geometry.6.pbf');

  var data = await tiles.getTile(tilePath, false);
  t.equal(data.length, 7352);
  
  t.end();

});