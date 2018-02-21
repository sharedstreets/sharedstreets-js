import { lineString } from "@turf/helpers";
import * as fs from "fs";
import * as glob from "glob";
import * as path from "path";
import * as sharedstreetsPbf from "sharedstreets-pbf";
import test from "tape";
import * as sharedstreets from "./";

// fixtures
const message1 = "Intersection 110.000000 45.000000";
const message2 = "Intersection -74.003388 40.634538";
const message3 = "Intersection -74.004107 40.634060";
const pt1 = [110, 45];
const pt2 = [-74.003388, 40.634538];
const pt3 = [-74.004107, 40.63406];
const line1 = [[110, 45], [115, 50], [120, 55]];
const line2 = [[-74.007568359375, 40.75239562988281], [-74.00729370117188, 40.753089904785156]];
const line3 = [[-74.00778198242188, 40.72457504272461], [-74.0076675415039, 40.72519302368164]];

test("sharedstreets -- generateHash", (t) => {
  t.equal(sharedstreets.generateHash(message1), "71f34691f182a467137b3d37265cb3b6", "generateHash => message1");
  t.equal(sharedstreets.generateHash(message2), "103c2dbe16d28cdcdcd5e5e253eaa026", "generateHash => message2");
  t.equal(sharedstreets.generateHash(message3), "0f346cb98b5d8f0500e167cb0a390266", "generateHash => message3");
  t.end();
});

test("sharedstreets -- geometry", (t) => {
  t.equal(sharedstreets.geometryId(line1), "ce9c0ec1472c0a8bab3190ab075e9b21", "geometryId => line1");
  t.equal(sharedstreets.geometryId(line2), "02aa80dc9c72ea4175bfb10c05e5a2b9", "geometryId => line2");
  t.equal(sharedstreets.geometryId(line3), "58ae3bdd54f99e0331a8cb147557adcc", "geometryId => line3");

  t.equal(sharedstreets.geometryMessage(line1), "Geometry 110.000000 45.000000 115.000000 50.000000 120.000000 55.000000", "geometryMessage => line1");
  t.equal(sharedstreets.geometryMessage(line2), "Geometry -74.007568 40.752396 -74.007294 40.753090", "geometryMessage => line2");
  t.equal(sharedstreets.geometryMessage(line3), "Geometry -74.007782 40.724575 -74.007668 40.725193", "geometryMessage => line3");

  // Extras
  // https://github.com/sharedstreets/sharedstreets-pbf/blob/master/test/out/11-602-769.geometry.json
  const coords1 = sharedstreets.lonlatsToCoords([
    -74.008536,
    40.744171900000005,
    -74.0085628,
    40.7440325,
    -74.0085895,
    40.7438948,
    -74.0086801,
    40.7434298,
    -74.0087517,
    40.743065300000005,
  ]);
  const coords2 = sharedstreets.lonlatsToCoords([
    -74.007399,
    40.73337,
    -74.007025,
    40.733334,
  ]);
  t.equal(sharedstreets.geometryMessage(coords1), "Geometry -74.008536 40.744172 -74.008563 40.744033 -74.008590 40.743895 -74.008680 40.743430 -74.008752 40.743065", "message => coords1");
  t.equal(sharedstreets.geometryId(coords1), "8e1b6416c8931954511b4a175c737059", "id => coords1");

  t.equal(sharedstreets.geometryMessage(coords2), "Geometry -74.007399 40.733370 -74.007025 40.733334", "message => coords2");
  t.equal(sharedstreets.geometryId(coords2), "8e2f3977a03a0723cf1cd46d37244427", "id => coords2");
  t.end();
});

test("sharedstreets -- intersection", (t) => {
  t.equal(sharedstreets.intersectionId(pt1), "71f34691f182a467137b3d37265cb3b6", "intersectionId => pt1");
  t.equal(sharedstreets.intersectionId(pt2), "103c2dbe16d28cdcdcd5e5e253eaa026", "intersectionId => pt2");
  t.equal(sharedstreets.intersectionId(pt3), "0f346cb98b5d8f0500e167cb0a390266", "intersectionId => pt3");

  t.equal(sharedstreets.intersectionMessage(pt1), "Intersection 110.000000 45.000000", "intersectionMessage => pt1");
  t.equal(sharedstreets.intersectionMessage(pt2), "Intersection -74.003388 40.634538", "intersectionMessage => pt2");
  t.equal(sharedstreets.intersectionMessage(pt3), "Intersection -74.004107 40.634060", "intersectionMessage => pt3");

  // Extras
  t.equal(sharedstreets.intersectionId([-74.00962750000001, 40.740100500000004]), "803182394d597ae26d70807a89ed400c", "intersectionId => extra1");
  t.equal(sharedstreets.intersectionMessage([-74.00962750000001, 40.740100500000004]), "Intersection -74.009628 40.740101", "intersectionMessage => extra1");
  t.end();
});

test("sharedstreets -- referenceId", (t) => {
  const locationReferenceOutbound = sharedstreets.locationReference([-74.0048213, 40.7416415], {outboundBearing: 208, distanceToNextRef: 9279});
  const locationReferenceInbound = sharedstreets.locationReference([-74.0051265, 40.7408505], {inboundBearing: 188});
  const formOfWay = 2; // => "MultipleCarriageway"

  t.equal(locationReferenceOutbound.intersectionId, "69f13f881649cb21ee3b359730790bb9", "locationReferenceOutbound => intersectionId");
  t.equal(locationReferenceInbound.intersectionId, "f361178c33988ef9bfc8b51b7545c5fa", "locationReferenceInbound => intersectionId");

  t.equal(sharedstreets.referenceMessage([locationReferenceOutbound, locationReferenceInbound], formOfWay), "Reference 2 -74.004821 40.741642 208 9279 -74.005127 40.740851", "referenceId => pt1");
  t.equal(sharedstreets.referenceId([locationReferenceOutbound, locationReferenceInbound], formOfWay), "ef209661aeebadfb4e0a2cb93153493f", "referenceId => pt1");
  t.end();
});

test("sharedstreets -- locationReference", (t) => {
  const options = {
    distanceToNextRef: 9279,
    outboundBearing: 208,
  };
  const locRef = sharedstreets.locationReference([-74.0048213, 40.7416415], options);

  t.equal(locRef.intersectionId, "69f13f881649cb21ee3b359730790bb9", "locRef => intersectionId");
  t.end();
});

test("sharedstreets-pbf -- intersection", (t) => {
  glob.sync(path.join(__dirname, "test", "in", `*.intersection.pbf`)).forEach((filepath) => {
    const buffer = fs.readFileSync(filepath);
    const intersections = sharedstreetsPbf.intersection(buffer);

    intersections.forEach((intersection) => {
      const {lon, lat, id} = intersection;
      const expectedId = sharedstreets.intersectionId([lon, lat]);
      const message = sharedstreets.intersectionMessage([lon, lat]);

      t.equal(expectedId, id, `[${message}] => ${id}`);
    });
  });
  t.end();
});

test("sharedstreets-pbf -- geometry", (t) => {
  glob.sync(path.join(__dirname, "test", "in", `*.geometry.pbf`)).forEach((filepath) => {
    const buffer = fs.readFileSync(filepath);
    const geometries = sharedstreetsPbf.geometry(buffer);

    geometries.forEach((geometry) => {
      const {lonlats, id} = geometry;
      const coords = sharedstreets.lonlatsToCoords(lonlats);
      const expectedId = sharedstreets.geometryId(coords);
      const message = sharedstreets.geometryMessage(coords);

      t.equal(expectedId, id, `[${message}] => ${id}`);
    });
  });
  t.end();
});

test("sharedstreets-pbf -- reference", (t) => {
  glob.sync(path.join(__dirname, "test", "in", `*.reference.pbf`)).forEach((filepath) => {
    const buffer = fs.readFileSync(filepath);
    const geometries = sharedstreetsPbf.reference(buffer);

    geometries.forEach((reference) => {
      const {locationReferences, id, formOfWay} = reference;
      const expectedId = sharedstreets.referenceId(locationReferences, formOfWay);
      const message = sharedstreets.referenceMessage(locationReferences, formOfWay);

      t.equal(expectedId, id, `[${message}] => ${id}`);
    });
  });
  t.end();
});

test("sharedstreets -- coordsToLonlats", (t) => {
  const lonlats = sharedstreets.coordsToLonlats([[110, 45], [120, 55]]);
  t.deepEqual(lonlats, [110, 45, 120, 55]);
  t.end();
});

test("sharedstreets -- geometry", (t) => {
  const line = [[110, 45], [115, 50], [120, 55]];
  const geom = sharedstreets.geometry(line);
  t.equal(geom.id, "ce9c0ec1472c0a8bab3190ab075e9b21");
  t.end();
});

test("sharedstreets -- intersection", (t) => {
  const intersect = sharedstreets.intersection([110, 45]);
  t.deepEqual(intersect, {
    id: "71f34691f182a467137b3d37265cb3b6",
    lat: 45,
    lon: 110,
    inboundReferenceIds: [],
    outboundReferenceIds: [],
  });
  t.end();
});

test("sharedstreets -- reference", (t) => {
  const line = [[110, 45], [115, 50], [120, 55]];
  const geom = sharedstreets.geometry(line);
  const locationReferences = [
    sharedstreets.locationReference([-74.0048213, 40.7416415], {outboundBearing: 208, distanceToNextRef: 9279}),
    sharedstreets.locationReference([-74.0051265, 40.7408505], {inboundBearing: 188}),
  ];
  const formOfWay = 0; // => "Other"
  const ref = sharedstreets.reference(geom, locationReferences, formOfWay);
  t.equal(ref.id, "b1a2b1764dc639c0bbcd8e131ef06ca8");
  t.end();
});

test("sharedstreets -- metadata", (t) => {
  const line = [[110, 45], [115, 50], [120, 55]];
  const gisMetadata = [{source: "sharedstreets", sections: [{sectionId: "foo", sectionProperties: "bar"}]}];
  const geom = sharedstreets.geometry(line);
  const metadata = sharedstreets.metadata(geom, {}, gisMetadata);

  t.deepEqual(metadata, {
    geometryId: "ce9c0ec1472c0a8bab3190ab075e9b21",
    osmMetadata: {},
    gisMetadata: [
      { source: "sharedstreets", sections: [{sectionId: "foo", sectionProperties: "bar"}]},
    ],
  });
  t.end();
});

test("sharedstreets -- getFormOfWay", (t) => {
  const lineA = lineString([[110, 45], [115, 50], [120, 55]], {formOfWay: 3});
  const lineB = lineString([[110, 45], [115, 50], [120, 55]]);
  const lineC = lineString([[110, 45], [115, 50], [120, 55]], {formOfWay: "Motorway"});

  t.equal(sharedstreets.getFormOfWay(lineA), 3);
  t.equal(sharedstreets.getFormOfWay(lineB), 0);
  t.equal(sharedstreets.getFormOfWay(lineC), 1);
  t.end();
});

test("sharedstreets -- forwardReference", (t) => {
  const line = [[110, 45], [115, 50], [120, 55]];
  const forwardReference = sharedstreets.forwardReference(line).id;
  const backReference = sharedstreets.backReference(line).id;

  t.equal(forwardReference, "393dd4d6967874e601b4331637241d19");
  t.equal(backReference, "c542190b96358772c70deaa7e14b0936");
  t.end();
});

test("sharedstreets -- bearing & distance", (t) => {
  const line = [[-74.006449, 40.739405000000005], [-74.00790070000001, 40.7393884], [-74.00805100000001, 40.7393804]];
  const inboundBearing = sharedstreets.inboundBearing(line);
  const outboundBearing = sharedstreets.outboundBearing(line);
  const distanceToNextRef = sharedstreets.distanceToNextRef(line);

  t.equal(outboundBearing, 277); // => 269 Java Implementation
  t.equal(inboundBearing, 88); // => 267 Java Implementation
  t.equal(distanceToNextRef, 13501); // => 13536 Java Implementation
  t.skip("outboundBearing does not match Java Implementation");
  t.skip("inboundBearing does not match Java Implementation");
  t.skip("distanceToNextRef does not match Java Implementation");
  t.end();
});

test("sharedstreets -- round", (t) => {
  t.equal(Number(sharedstreets.round(10.123456789)), 10.123457);
  t.end();
});

test("sharedstreets -- closed loops - Issue #8", (t) => {
  // https://github.com/sharedstreets/sharedstreets-conflator/issues/8

  const line = [
    [-79.549159053, 43.615639543],
    [-79.548687537, 43.615687142],
    [-79.547733353, 43.615744613],
    [-79.548036429, 43.614913292],
    [-79.549024608, 43.615542992],
    [-79.549159053, 43.615639543],
  ];
  t.assert(sharedstreets.forwardReference(line));
  t.assert(sharedstreets.backReference(line));
  t.end();
});
