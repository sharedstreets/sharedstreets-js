export {run} from '@oclif/command'

import bearing from "@turf/bearing";
import { bearingToAzimuth, Feature, lineString, LineString, Point, Position} from "@turf/helpers";
import { getCoord } from "@turf/invariant";
import length from "@turf/length";
import along from "@turf/along";
import BigNumber from "bignumber.js";
import { createHash } from "crypto";
import {
  FormOfWay, GISMetadata, LocationReference, OSMMetadata,
  SharedStreetsGeometry, SharedStreetsIntersection, SharedStreetsMetadata, SharedStreetsReference,
} from "sharedstreets-types";
import { isArray } from "util";

/**
 * Shared Streets Java implementation
 *
 * @private
 * Intersection
 * https://github.com/sharedstreets/sharedstreets-builder/blob/master/src/main/java/io/sharedstreets/data/SharedStreetsIntersection.java#L42-L49
 *
 * Geometry
 * https://github.com/sharedstreets/sharedstreets-builder/blob/master/src/main/java/io/sharedstreets/data/SharedStreetsGeometry.java#L98-L108
 *
 * Reference
 * https://github.com/sharedstreets/sharedstreets-builder/blob/master/src/main/java/io/sharedstreets/data/SharedStreetsReference.java#L323-L340
 *
 * Location Reference
 * https://github.com/sharedstreets/sharedstreets-builder/blob/master/src/main/java/io/sharedstreets/data/SharedStreetsLocationReference.java
 *
 * OpenLR White Paper
 * http://www.openlr.org/data/docs/OpenLR-Whitepaper_v1.5.pdf
 */

/**
 * Geometry Id
 *
 * @param {Feature<LineString>|Array<Array<number>>} line Line Geometry as a GeoJSON LineString or an Array of Positions Array<<longitude, latitude>>.
 * @returns {string} SharedStreets Geometry Id
 * @example
 * const id = sharedstreets.geometryId([[110, 45], [115, 50], [120, 55]]);
 * id // => "ce9c0ec1472c0a8bab3190ab075e9b21"
 */
export function geometryId(line: Feature<LineString> | LineString | number[][]): string {
  const message = geometryMessage(line);
  return generateHash(message);
}

/**
 * Geometry Message
 *
 * @private
 */
export function geometryMessage(line: Feature<LineString> | LineString | number[][]): string {
  const coords = getCoords(line);
  return "Geometry " + coords.map(([x, y]) => `${round(x)} ${round(y)}`).join(" ");
}

/**
 * geometry
 *
 * @param {Feature<LineString>|Array<Array<number>>} line GeoJSON LineString Feature
 * @param {Object} [options={}] Optional parameters
 * @param {string} [options.formOfWay] Property field that contains FormOfWay value (number/string).
 * @param {string} [options.roadClass] Property field that contains RoadClass value (number/string).
 * @returns {SharedStreetsGeometry} SharedStreets Geometry
 * @example
 * const line = [[110, 45], [115, 50], [120, 55]];
 * const geom = sharedstreets.geometry(line);
 * geom.id; // => "ce9c0ec1472c0a8bab3190ab075e9b21"
 * geom.lonlats; // => [ 110, 45, 115, 50, 120, 55 ]
 */
export function geometry(line: Feature<LineString>, options: {
  formOfWay?: string,
  roadClass?: string,
  // To-Do
  // - fromIntersection [optional]
  // - toIntersection [optional]
  // - forwardReference [optional]
  // - backReference [optional]
} = {}): SharedStreetsGeometry {
  let properties: any = {};
  const coords = getCoords(line);

  // Extract Properties from GeoJSON LineString Feature
  if (!isArray(line) && line.type === "Feature") { properties = line.properties || {}; }


  // FormOfWay needs to be extracted from the GeoJSON properties.
  let formOfWay = 0;
  if (options.formOfWay && properties[options.formOfWay]) {
    formOfWay = properties[options.formOfWay];
  }

  // RoadClass needs to be extracted from the GeoJSON properties.
  let roadClass = "Other";
  if (options.roadClass && properties[options.roadClass]) {
    roadClass = properties[options.roadClass];
  }
  const forwardRef = forwardReference(line, {formOfWay:formOfWay});
  const backRef = backReference(line, {formOfWay:formOfWay});
  const forwardReferenceId = forwardRef.id;
  const backReferenceId = backRef.id;

  const fromIntersectionId = forwardRef.locationReferences[0].intersectionId;
  const toIntersectionId = forwardRef.locationReferences[forwardRef.locationReferences.length-1].intersectionId;

  // Save Results
  const id = geometryId(line);
  const lonlats = coordsToLonlats(coords);

  return {
    id,
    fromIntersectionId,
    toIntersectionId,
    forwardReferenceId,
    backReferenceId,
    roadClass,
    lonlats,
  };
}

/**
 * Intersection Id
 *
 * @param {Feature<Point>|Array<number>} pt Point location reference as a GeoJSON Point or an Array of numbers <longitude, latitude>.
 * @returns {string} SharedStreets Intersection Id
 * @example
 * const id = sharedstreets.intersectionId([110, 45]);
 * id // => "71f34691f182a467137b3d37265cb3b6"
 */
export function intersectionId(pt: number[] | Feature<Point> | Point, id?:string | number): string {
  const message = intersectionMessage(pt, id);
  return generateHash(message);
}

/**
 * Intersection Message
 *
 * @private
 */
export function intersectionMessage(pt: number[] | Feature<Point> | Point, id?:string | number): string {
  const [lon, lat] = getCoord(pt);
  var message = `Intersection ${round(lon)} ${round(lat)}`;
  if(id != undefined)
    message = message + ' ' + id;
  return message

}

/**
 * Intersection
 *
 * @param {Feature<Point>|Array<number>} pt Point location reference as a GeoJSON Point or an Array of numbers <longitude, latitude>.
 * @param {Object} [options={}] Optional parameters
 * @param {string} [options.nodeId] Define NodeId for Intersection
 * @returns {SharedStreetsIntersection} SharedStreets Intersection
 * @example
 * const intersection = sharedstreets.intersection([110, 45]);
 * intersection.id // => "71f34691f182a467137b3d37265cb3b6"
 */
export function intersection(pt: number[] | Feature<Point> | Point, options: {
  nodeId?: number | string,
  inboundReferences?: LocationReference[],
  outboundReferencesIds?: LocationReference[],
} = {}): SharedStreetsIntersection {
  // Default params
  const inboundReferences = options.inboundReferences || [];
  const outboundReferences = options.outboundReferencesIds || [];
  const nodeId = options.nodeId;

  // Main
  const [lon, lat] = getCoord(pt);
  const id = intersectionId(pt, nodeId);
  const inboundReferenceIds = inboundReferences.map((ref) => ref.intersectionId);
  const outboundReferenceIds = outboundReferences.map((ref) => ref.intersectionId);

  const data: SharedStreetsIntersection = {
    id,
    lon,
    lat,
    inboundReferenceIds,
    outboundReferenceIds,
  };
  if (nodeId !== undefined) { data.nodeId = nodeId; }
  return data;
}

/**
 * Reference Id
 *
 * @param {Array<LocationReference>} locationReferences An Array of Location References.
 * @param {FormOfWay} [formOfWay=0] Form Of Way
 * @returns {string} SharedStreets Reference Id
 * @example
 * const locationReferences = [
 *   sharedstreets.locationReference([-74.0048213, 40.7416415], {outboundBearing: 208, distanceToNextRef: 9279}),
 *   sharedstreets.locationReference([-74.0051265, 40.7408505], {inboundBearing: 188})
 * ];
 * const formOfWay = 2; // => "MultipleCarriageway"
 *
 * const id = sharedstreets.referenceId(locationReferences, formOfWay);
 * id // => "ef209661aeebadfb4e0a2cb93153493f"
 */
export function referenceId(
  locationReferences: LocationReference[],
  formOfWay = FormOfWay.Undefined,
): string {
  const message = referenceMessage(locationReferences, formOfWay);
  const hash = generateHash(message);
  return hash;
}

/**
 * Reference Message
 *
 * @private
 */
export function referenceMessage(
  locationReferences: LocationReference[],
  formOfWay = FormOfWay.Undefined,
): string {
  // Convert FormOfWay to Number if encoding ID
  if (typeof formOfWay !== "number") { formOfWay = getFormOfWayNumber(formOfWay); }

  let message = `Reference ${formOfWay}`;
  locationReferences.forEach((lr) => {
    message += ` ${round(lr.lon)} ${round(lr.lat)}`;
    if (lr.outboundBearing !== null && lr.outboundBearing !== undefined &&
        lr.distanceToNextRef !== null && lr.distanceToNextRef !== undefined) {
      message += ` ${Math.round(lr.outboundBearing)}`;
      message += ` ${Math.round(Math.round(lr.distanceToNextRef / 100))}`; // distanceToNextRef  stored in centimeter but using meters to compute ref Id
    }
  });
  return message;
}

/**
 * Reference
 *
 * @param {SharedStreetsGeometry} geom SharedStreets Geometry
 * @param {Array<LocationReference>} locationReferences An Array of Location References.
 * @param {number} [formOfWay=0] Form Of Way (default Undefined)
 * @returns {SharedStreetsReference} SharedStreets Reference
 * @example
 * const line = [[110, 45], [115, 50], [120, 55]];
 * const geom = sharedstreets.geometry(line);
 * const locationReferences = [
 *   sharedstreets.locationReference([-74.0048213, 40.7416415], {outboundBearing: 208, distanceToNextRef: 9279}),
 *   sharedstreets.locationReference([-74.0051265, 40.7408505], {inboundBearing: 188}),
 * ];
 * const formOfWay = 2; // => "MultipleCarriageway"
 * const ref = sharedstreets.reference(geom, locationReferences, formOfWay);
 * ref.id // => "ef209661aeebadfb4e0a2cb93153493f"
 */
export function reference(
  geom: SharedStreetsGeometry,
  locationReferences: LocationReference[],
  formOfWay = FormOfWay.Undefined,
): SharedStreetsReference {
  return {
    id: referenceId(locationReferences, formOfWay),
    geometryId: geom.id,
    formOfWay,
    locationReferences,
  };
}

/**
 * Forward Reference
 *
 * @param {Feature<LineString>|Array<Array<number>>} line GeoJSON LineString Feature or an Array of Positions
 * @param {Object} [options={}] Optional parameters
 * @param {number|string} [options.formOfWay=0] Form of Way (default "Undefined")
 * @returns {SharedStreetsReference} Forward SharedStreets Reference
 * @example
 * const line = [[110, 45], [115, 50], [120, 55]];
 * const ref = sharedstreets.forwardReference(line);
 * ref.id // => "3f652e4585aa7d7df3c1fbe4f55cea0a"
 */
export function forwardReference (
  line: Feature<LineString>,
  options: {
    formOfWay?: number|string,
  } = {},
): SharedStreetsReference {

  const lineLength = Math.round(length(line, {units: "meters"}) * 100); 

  const formOfWay = getFormOfWay(line, options);
  const geomId = geometryId(line);

  // lines over 15 are divided into smaller segments
  const MAX_SEGMENT_LENGTH = 15000;
  var segmentCount = Math.ceil(lineLength / MAX_SEGMENT_LENGTH);

  var locationReferences = [];

  for(var i = 0; i < segmentCount + 1; i++){
    var refProperties:{
      outboundBearing?:number, 
      inboundBearing?:number,
      distanceToNextRef?:number } = {};

    if(i < segmentCount){ 
      refProperties.outboundBearing = outboundBearing(line, lineLength, i * (lineLength / segmentCount));
      refProperties.distanceToNextRef = Math.round((lineLength / segmentCount) * 100); 
    }
    if(i > 0){ 
      refProperties.inboundBearing = inboundBearing(line, lineLength, i * (lineLength / segmentCount));
    }
    
    var lrCoord;
    
    if(i == 0)
      lrCoord = getStartCoord(line);
    else if(i == segmentCount) 
      lrCoord = getEndCoord(line);
    else {
      var pos = i * (lineLength / segmentCount);
      var pt = along(line, pos);
      lrCoord = getCoord(pt);
    }

    var ref = locationReference(lrCoord, refProperties);
    locationReferences.push(ref);
  }

  const id = referenceId(locationReferences, formOfWay);

  return {
    id,
    geometryId: geomId,
    formOfWay,
    locationReferences
  };
}

/**
 * Back Reference
 *
 * @param {Feature<LineString>|Array<Array<number>>} line GeoJSON LineString Feature or an Array of Positions
 * @param {Object} [options={}] Optional parameters
 * @param {number|string} [options.formOfWay=0] Form of Way (default "Undefined")
 * @returns {SharedStreetsReference} Back SharedStreets Reference
 * @example
 * const line = [[110, 45], [115, 50], [120, 55]];
 * const ref = sharedstreets.backReference(line);
 * ref.id // => "a18b2674e41cad630f5693154837baf4"
 */
export function backReference(
  line: Feature<LineString>,
  options: {
    formOfWay?: number|string,
  } = {},
): SharedStreetsReference {
    var reversedLine = JSON.parse(JSON.stringify(line))
    reversedLine.geometry.coordinates.reverse();
    return forwardReference(reversedLine,  options);
}

/**
 * Location Reference
 *
 * @private
 * @param {Feature<Point>|Array<number>} pt Point as a GeoJSON Point or an Array of numbers <longitude, latitude>.
 * @param {Object} [options={}] Optional parameters
 * @param {string} [options.intersectionId] Intersection Id - Fallbacks to input's point `id` or generates Intersection Id.
 * @param {number} [options.inboundBearing] Inbound bearing of the street geometry for the 20 meters immediately following the location reference.
 * @param {number} [options.outboundBearing] Outbound bearing.
 * @param {number} [options.distanceToNextRef] Distance to next Location Reference (distance must be defined in centimeters).
 * @returns {LocationReference} SharedStreets Location Reference
 * @example
 * const options = {
 *   outboundBearing: 208,
 *   distanceToNextRef: 9279
 * };
 * const locRef = sharedstreets.locationReference([-74.00482177734375, 40.741641998291016], options);
 * locRef.intersectionId // => "5c88d4fa3900a083355c46c54da8f584"
 */
export function locationReference(
  pt: number[] | Feature<Point> | Point,
  options: {
    intersectionId?: string,
    inboundBearing?: number,
    outboundBearing?: number,
    distanceToNextRef?: number,
} = {}): LocationReference {
  const coord = getCoord(pt);
  const id = options.intersectionId || intersectionId(coord);

  // Include extra properties & Reference ID to GeoJSON Properties
  const locRef: LocationReference = {
    intersectionId: id,
    lat: coord[1],
    lon: coord[0],
  };
  if (options.inboundBearing !== undefined) { locRef.inboundBearing = options.inboundBearing; }
  if (options.outboundBearing !== undefined) { locRef.outboundBearing = options.outboundBearing; }
  if (options.distanceToNextRef !== undefined) { locRef.distanceToNextRef = options.distanceToNextRef; }

  if (locRef.outboundBearing !== undefined && locRef.distanceToNextRef === undefined) {
    throw new Error("distanceToNextRef is required if outboundBearing is present");
  }
  return locRef;
}

/**
 * Metadata
 *
 * @param {SharedStreetsGeometry} geom SharedStreets Geometry
 * @param {OSMMetadata} [osmMetadata={}] OSM Metadata
 * @param {Array<GISMetadata>} [gisMetadata=[]] GIS Metadata
 * @param {}
 * @returns {SharedStreetsMetadata} SharedStreets Metadata
 * @example
 * const line = [[110, 45], [115, 50], [120, 55]];
 * const geom = sharedstreets.geometry(line);
 * const metadata = sharedstreets.metadata(geom)
 */
export function metadata(
  geom: SharedStreetsGeometry,
  osmMetadata: OSMMetadata = {},
  gisMetadata: GISMetadata[] = [],
): SharedStreetsMetadata {
  return {
    geometryId: geom.id,
    osmMetadata,
    gisMetadata,
  };
}

/**
 * Calculates outbound bearing from a LineString
 *
 * @param {Feature<LineString>|Array<Array<number>>} line GeoJSON LineString or an Array of Positions
 * @param {number} len length of line
 * @param {number} dist distance along line to sample outbound bearing
 * @returns {number} Outbound Bearing
 * @example
 * const line = [[110, 45], [115, 50], [120, 55]];
 * const outboundBearing = sharedstreets.outboundBearing(line);
 * if line is less than 20 meters long bearing is from start to end of line
 * outboundBearing; // => 208
 */
export function outboundBearing(line: Feature<LineString>, len:number, dist:number): number {  
  // LRs describe the compass bearing of the street geometry for the 20 meters immediately following the LR.
  if(len > 20) { 
    const start = along(line, dist, {units: "meters"});
    const end = along(line, dist + 20, {units: "meters"});
    // Calculate outbound & inbound
    return bearingToAzimuth(Math.round(bearing(start, end)));
  }
  else {
    const start = along(line, 0, {units: "meters"});
    const end = along(line, len, {units: "meters"});
    // Calculate outbound & inbound
    return bearingToAzimuth(Math.round(bearing(start, end)));
  }

}

/**
 * Calculates inbound bearing from a LineString
 *
 * @param {Feature<LineString>|Array<Array<number>>} line GeoJSON LineString or an Array of Positions
 * @param {number} len length of line
 * @param {number} dist distance along line to sample outbound bearing
 * @returns {number} Inbound Bearing
 * @example
 * const line = [[110, 45], [115, 50], [120, 55]];
 * const inboundBearing = sharedstreets.inboundBearing(line);
 * if line is less than 20 meters long bearing is from start to end of line
 * inboundBearing; // => 188
 */
export function inboundBearing(line: Feature<LineString>, len:number, dist:number): number {
  if(len > 20) {
    const start = along(line, dist - 20, {units: "meters"});
    const end = along(line, dist, {units: "meters"});

    return bearingToAzimuth(Math.round(bearing(start, end)));
  } 
  else  {
    const start = along(line, 0, {units: "meters"});
    const end = along(line, len, {units: "meters"});

    return bearingToAzimuth(Math.round(bearing(start, end)));
  }
  
}

/**
 * Calculates inbound bearing from a LineString
 *
 * @param {Coord} start GeoJSON Point or an Array of numbers [Longitude/Latitude]
 * @param {Coord} end GeoJSON Point or an Array of numbers [Longitude/Latitude]
 * @returns {number} Distance to next Ref in centimeters
 * @example
 * const start = [110, 45];
 * const end = [120, 55];
 * const distanceToNextRef = sharedstreets.distanceToNextRef(start, end);
 * distanceToNextRef; // => 9279
 */
export function distanceToNextRef(line: Feature<LineString>): number {
  if (Array.isArray(line)) { line = lineString(line); }
  return Math.round(length(line, {units: "meters"}) * 100);
}

/**
 * Converts lonlats to GeoJSON LineString Coords
 *
 * @param {Array<number>} lonlats Single Array of paired longitudes & latitude
 * @returns {Array<Array<number>>}  GeoJSON LineString coordinates
 * @example
 * const coords = lonlatsToCoords([110, 45, 120, 55]);
 * coords // => [[110, 45], [120, 55]]
 */
export function lonlatsToCoords(lonlats: number[]) {
  const coords: number[][] = [];
  lonlats.reduce((lon, deg, index) => {
    if (index % 2 === 0) { return deg; } // Longitude
    coords.push([lon, deg]);
    return deg; // Latitude
  });
  return coords;
}

/**
 * Converts GeoJSON LineString Coords to lonlats
 *
 * @param {Array<Array<number, number>>} coords GeoJSON LineString coordinates
 * @returns {Array<number>} lonlats Single Array of paired longitudes & latitude
 * @example
 * const lonlats = coordsToLonlats([[110, 45], [120, 55]]);
 * lonlats // => [110, 45, 120, 55]
 */
export function coordsToLonlats(coords: number[][]) {
  const lonlats: number[] = [];
  coords.forEach((coord) => {
    lonlats.push(coord[0], coord[1]);
  });
  return lonlats;
}

/**
 * Generates Base16 Hash
 *
 * @param {string} message Message to hash
 * @returns {string} SharedStreets Reference ID
 * @example
 * const message = "Intersection -74.00482177734375 40.741641998291016";
 * const hash = sharedstreets.generateHash(message);
 * hash // => "69f13f881649cb21ee3b359730790bb9"
 */
export function generateHash(message: string): string {
  return createHash("md5").update(message).digest("hex");
}

/**
 * Get RoadClass from a Number to a String
 *
 * @param {number} value Number value [between 0-8]
 * @returns {string} Road Class
 * @example
 * sharedstreets.getRoadClassString(0); // => "Motorway"
 * sharedstreets.getRoadClassString(5); // => "Residential"
 */
export function getRoadClassString(value: number) {
  switch (value) {
    case 0: return "Motorway";
    case 1: return "Trunk";
    case 2: return "Primary";
    case 3: return "Secondary";
    case 4: return "Tertiary";
    case 5: return "Residential";
    case 6: return "Unclassified";
    case 7: return "Service";
    case 8: return "Other";
    default: throw new Error(`[${value}] unknown RoadClass Number value`);
  }
}

/**
 * Get RoadClass from a String to a Number
 *
 * @param {number} value String value ["Motorway", "Trunk", "Primary", etc...]
 * @returns {string} Road Class
 * @example
 * sharedstreets.getRoadClassNumber("Motorway"); // => 0
 * sharedstreets.getRoadClassNumber("Residential"); // => 5
 */
export function getRoadClassNumber(value: string) {
  switch (value) {
    case "Motorway": return 0;
    case "Trunk": return 1;
    case "Primary": return 2;
    case "Secondary": return 3;
    case "Tertiary": return 4;
    case "Residential": return 5;
    case "Unclassified": return 6;
    case "Service": return 7;
    case "Other": return 8;
    default: throw new Error(`[${value}] unknown RoadClass String value`);
  }
}

/**
 * Get FormOfWay from a GeoJSON LineString and/or Optional parameters
 *
 * @param {number} value Number value [between 0-7]
 * @returns {string} Form of Way
 * @example
 * sharedstreets.getFormOfWayString(0); // => "Undefined"
 * sharedstreets.getFormOfWayString(5); // => "TrafficSquare"
 */
export function getFormOfWayString(value: number): string {
  switch (value) {
    case undefined:
    case 0: return "Undefined";
    case 1: return "Motorway";
    case 2: return "MultipleCarriageway";
    case 3: return "SingleCarriageway";
    case 4: return "Roundabout";
    case 5: return "TrafficSquare";
    case 6: return "SlipRoad";
    case 7: return "Other";
    default: throw new Error(`[${value}] unknown FormOfWay Number value`);
  }
}

/**
 * Get FormOfWay from a GeoJSON LineString
 *
 * @param {Feature<LineString>|Array<Array<number>>} line GeoJSON LineString Feature or an Array of Positions
 * @param {Object} [options={}] Optional parameters
 * @param {number} [options.formOfWay=0] Form of Way
 * @example
 * const lineA = turf.lineString([[110, 45], [115, 50], [120, 55]], {formOfWay: 3});
 * const lineB = turf.lineString([[110, 45], [115, 50], [120, 55]]);
 * const lineC = turf.lineString([[110, 45], [115, 50], [120, 55]], {formOfWay: "Motorway"});
 *
 * sharedstreets.getFormOfWay(lineA); // => 3
 * sharedstreets.getFormOfWay(lineB); // => 0
 * sharedstreets.getFormOfWay(lineC); // => 1
 */
export function getFormOfWay(
  line: Feature<LineString> | LineString | Position[],
  options: {
    formOfWay?: number | string,
  } = {},
): number {
  // Set default to Other (0)
  let formOfWay: number | string = FormOfWay.Undefined;

  // Retrieve formOfWay from Optional Parameters (priority order since it is user defined)
  if (options.formOfWay !== undefined) {
    formOfWay = options.formOfWay;

    // Retrieve formOfWay via GeoJSON LineString properties
  } else if (!Array.isArray(line) && line.type === "Feature" && line.properties && line.properties.formOfWay) {
    formOfWay = line.properties.formOfWay;
  }

  // Assert value to Number
  if (typeof formOfWay === "string") { formOfWay = getFormOfWayNumber(formOfWay); }

  return formOfWay;
}

/**
 * Get Start Coordinate from a GeoJSON LineString
 *
 * @param {Feature<LineString>|Array<Position>} line GeoJSON LineString or an Array of Positiosn
 * @returns {Position} Start Coordinate
 * @example
 * const line = turf.lineString([[110, 45], [115, 50], [120, 55]]);
 * const start = sharedstreets.getStartCoord(line);
 * start // => [110, 45]
 */
export function getStartCoord(line: Feature<LineString> | LineString | Position[]): Position {
  // Array of Positions
  if (Array.isArray(line)) {
    return line[0];
  // GeoJSON Feature
  } else if (line.type === "Feature" && line.geometry) {
    return line.geometry.coordinates[0];
  // GeoJSON Geometry
  } else if (line.type === "LineString") {
    return line.coordinates[0];
  } else {
    throw new Error("invalid line");
  }
}

/**
 * Get Start Coordinate from a GeoJSON LineString
 *
 * @param {Feature<LineString>|Array<Position>} line GeoJSON LineString or an Array of Positiosn
 * @returns {Position} Start Coordinate
 * @example
 * const line = turf.lineString([[110, 45], [115, 50], [120, 55]]);
 * const end = sharedstreets.getEndCoord(line);
 * end // => [120, 55]
 */
export function getEndCoord(line: Feature<LineString> | LineString | Position[]): Position {
  // Array of Positions
  if (Array.isArray(line)) {
    return line[line.length - 1];
  // GeoJSON Feature
  } else if (line.type === "Feature" && line.geometry) {
    return line.geometry.coordinates[line.geometry.coordinates.length - 1];
  // GeoJSON Geometry
  } else if (line.type === "LineString") {
    return line.coordinates[line.coordinates.length - 1];
  } else {
    throw new Error("invalid line");
  }
}

/**
 * Get FormOfWay from a String to a Number
 *
 * @param {number} value String value [ex: "Undefined", "Motorway", etc...]
 * @returns {number} Form of Way
 * @example
 * sharedstreets.getFormOfWayNumber("Undefined"); // => 0
 * sharedstreets.getFormOfWayNumber("TrafficSquare"); // => 5
 */
export function getFormOfWayNumber(value: string) {
  switch (value) {
    case undefined:
    case "Undefined": return 0;
    case "Motorway": return 1;
    case "MultipleCarriageway": return 2;
    case "SingleCarriageway": return 3;
    case "Roundabout": return 4;
    case "TrafficSquare": return 5;
    case "SlipRoad": return 6;
    case "Other": return 7;
    default: throw new Error(`[${value}] unknown FormOfWay String value`);
  }
}

/**
 * getCoords
 *
 * @param {Feature<LineString>|Array<Array<number>>} line GeoJSON LineString or an Array of positions
 * @returns {Array<Array<number>>} Array of positions
 * @example
 * const line = turf.lineString([[110, 45], [115, 50], [120, 55]]);
 * const coords = sharedstreets.getCoords(line);
 * coords; // => [[110, 45], [115, 50], [120, 55]]
 */
export function getCoords(line: Feature<LineString> | LineString | number[][]): number[][] {
  // Deconstruct GeoJSON LineString
  let coords: number[][];
  if (isArray(line)) {
    coords = line;
  } else if (line.type === "Feature") {
    if (line.geometry === null) { throw new Error("line geometry cannot be null"); }
    coords = line.geometry.coordinates;
  } else {
    coords = line.coordinates;
  }
  return coords;
}

/**
 * Round Number to 5 decimals
 *
 * @param {number} num Number to round
 * @param {number} [decimalPlaces=5] Decimal Places
 * @returns {string} Big Number fixed string
 * @example
 * sharedstreets.round(10.123456789) // => 10.123457
 */

export function round(num: number, decimalPlaces = 5): string {
  return new BigNumber(String(num)).toFixed(decimalPlaces);
}
