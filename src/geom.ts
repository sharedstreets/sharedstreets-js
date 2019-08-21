import destination from '@turf/destination';
import envelope from '@turf/envelope';
import * as turfHelpers from '@turf/helpers';
import bbox from '@turf/bbox';


export function envelopeBufferFromPoint(point, radius):turfHelpers.Feature<turfHelpers.Polygon> {
    var nwPoint = destination(point, radius, 315, {'units':'meters'});
    var sePoint = destination(point, radius, 135, {'units':'meters'});
    return envelope(turfHelpers.featureCollection([nwPoint, sePoint]));
}   

export function bboxFromPolygon(polygon) {
	var bboxCoords = bbox(polygon)
	return {"minX": bboxCoords[0], "minY": bboxCoords[1], "maxX":bboxCoords[2], "maxY":bboxCoords[3]}
}

function cleanProperties(og_props:{}) {
	var  new_props:{} = {};
	for(var prop of Object.keys(og_props)) {
	  new_props[prop.toLocaleLowerCase().trim().replace(/ /g, "_")] = og_props[prop];
	}
	return new_props;
  }

export function reverseLineString(line:turfHelpers.Feature<turfHelpers.LineString>):turfHelpers.Feature<turfHelpers.LineString>|turfHelpers.LineString {
	var reverseLineFeature:turfHelpers.Feature<turfHelpers.LineString> = JSON.parse(JSON.stringify(line));

	if(reverseLineFeature.geometry && reverseLineFeature.geometry.coordinates) {
		reverseLineFeature.geometry.coordinates.reverse();
    	return reverseLineFeature;
	}
	else {
		var reverseLine:turfHelpers.LineString = JSON.parse(JSON.stringify(line));
		reverseLine.coordinates.reverse();
		return reverseLine;
	}	
}

export class CleanedPoints {
	clean:turfHelpers.Feature<turfHelpers.Point>[] = [];
	invalid:any[] = [];

	constructor(inputData:any) {
		try {
			var inputFeatures = [];
			if(inputData.type === "FeatureCollection") {
				inputFeatures = inputFeatures.concat(inputData.features);
			}
			else if(inputData.type === "Feature") {

				inputFeatures.push(inputData);
			}
			else if(inputData.type === "GeometryCollection") {
				for(var geometry of inputData.geometies) {
					inputFeatures.push({type:"Feature", properties: {}, geometry: geometry});
				}
			}
			else if (inputData.type === "Point") {
				inputFeatures.push({type:"Feature", properties: {}, geometry: inputData});
			}
			else {
				this.invalid.push(inputData);
			}

			for(var inputFeature of inputFeatures) {

				// move properties to lowercase
				inputFeature.properties = cleanProperties(inputFeature.properties);

				if (inputFeature.geometry.type === "Point"){
					this.clean.push(inputFeature);
				}
				else {
					this.invalid.push(inputFeature);
				}
			}
		}
		catch(e) {
			throw e;
		}

	}
}

export class CleanedLines {
	clean:turfHelpers.Feature<turfHelpers.LineString>[] = [];
	invalid:any[];

	constructor(inputData:any) {

		this.invalid = [];

		try {
			var inputFeatures = [];
			if(inputData.type === "FeatureCollection") {
				inputFeatures = inputFeatures.concat(inputData.features);
			}
			else if(inputData.type === "Feature") {
				inputFeatures.push(inputData);
			}
			else if(inputData.type === "GeometryCollection") {
				for(var geometry of inputData.geometies) {
					inputFeatures.push({type:"Feature", properties: {}, geometry: geometry});
				}
			}
			else if (inputData.type === "LineString" || inputData.type === "MultiLineString") {
				inputFeatures.push({type:"Feature", properties: {}, geometry: inputData});
			}
			else {
				this.invalid.push[inputData];
			}
	
			for(var inputFeature of inputFeatures) {

				// move properties to lowercase
				inputFeature.properties = cleanProperties(inputFeature.properties);
	
				if (inputFeature.geometry.type === "LineString"){
					if(this.validLength(inputFeature))
						this.clean.push(inputFeature);
					else 
						this.invalid.push(inputFeature);
				}
				else if (inputFeature.geometry.type === "MultiLineString"){
					// convert multi linestring features to linestrings
					if(inputFeature.geometry.coordinates.length == 1){
	
						// only contains a single line, just remove one level of array heirachy
						inputFeature.geometry.coordinates = inputFeature.geometry.coordinates[0];
						inputFeature.geometry.type = "LineString";
						if(this.validLength(inputFeature))
							this.clean.push(inputFeature);
						else 
							this.invalid.push(inputFeature);	
	
					}
					else if(inputFeature.geometry.coordinates.length > 1) {
	
						// make copy of feature
						var newFeature = JSON.parse(JSON.stringify(inputFeature));;
						newFeature.geometry.type = "LineString";
						newFeature.geometry.coordinates = [];
	
						for(var lineStringCoordinates of inputFeature.geometry.coordinates) {
							
							if(newFeature.geometry.coordinates.length == 0) {
								newFeature.geometry.coordinates = lineStringCoordinates;
							}
							else if(newFeature.geometry.coordinates[newFeature.geometry.coordinates.length-1][0] === 
									lineStringCoordinates[0][0] && 
									newFeature.geometry.coordinates[newFeature.geometry.coordinates.length-1][1] === 
									lineStringCoordinates[0][1]) {
								
								// continous line feature -- merge
	
								// remove duplicate end point
								newFeature.geometry.coordinates.splice(-1);
								newFeature.geometry.coordinates = newFeature.geometry.coordinates.concat(lineStringCoordinates);
							}
							else {
								// disjoint line feature -- save current line and start over with new feature
								if(this.validLength(newFeature))
									this.clean.push(newFeature);
								else 
									this.invalid.push(newFeature);	
								newFeature = JSON.parse(JSON.stringify(inputFeature));;
								newFeature.geometry.type = "LineString";
								newFeature.geometry.coordinates = lineStringCoordinates;
							}
						}
	
						if(newFeature.geometry.coordinates.length > 0){
							if(this.validLength(newFeature))
								this.clean.push(newFeature);
							else 
								this.invalid.push(newFeature);	
						}
					}
					else {
						this.invalid.push(inputFeature);	
					} 
				}
				else {
					this.invalid.push(inputFeature);
				}
			}
		}
		catch(e) {
			throw e;
		}
	}

	validLength(line:turfHelpers.Feature<turfHelpers.LineString>):boolean {
		if(line.geometry.coordinates.length > 1) 
			return true;
		else 
			return false;
	}
}

