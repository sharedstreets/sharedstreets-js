import destination from '@turf/destination';
import * as helpers from '@turf/helpers';
import envelope from '@turf/envelope';
import {Feature, Polygon, LineString} from '@turf/helpers'


export function envelopeBufferFromPoint(point, radius):Feature<Polygon> {
    var nwPoint = destination(point, radius, 315, {'units':'meters'});
    var sePoint = destination(point, radius, 135, {'units':'meters'});
    return envelope(helpers.featureCollection([nwPoint, sePoint]));
}   

export function reverseLineString(line:Feature<LineString>):Feature<LineString>|LineString {
	var reverseLineFeature:Feature<LineString> = JSON.parse(JSON.stringify(line));

	if(reverseLineFeature.geometry && reverseLineFeature.geometry.coordinates) {
		reverseLineFeature.geometry.coordinates.reverse();
    	return reverseLineFeature;
	}
	else {
		var reverseLine:LineString = JSON.parse(JSON.stringify(line));
		reverseLine.coordinates.reverse();
		return reverseLine;
	}	
}

export function cleanGeometry(inputData) {
    var features = [];
	var invalidFeatures = [];
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
			invalidFeatures.push[inputData];
		}

		for(var inputFeature of inputFeatures) {

			if (inputFeature.geometry.type === "LineString"){
				features.push(inputFeature);
			}
			else if (inputFeature.geometry.type === "MultiLineString"){
				// convert multi linestring features to linestrings
				if(inputFeature.geometry.coordinates.length == 1){

					// only contains a single line, just remove one level of array heirachy
					inputFeature.geometry.coordinates = inputFeature.geometry.coordinates[0];
					inputFeature.geometry.type = "LineString";
					features.push(inputFeature);

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
							features.push(newFeature);
							newFeature = JSON.parse(JSON.stringify(inputFeature));;
							newFeature.geometry.type = "LineString";
							newFeature.geometry.coordinates = lineStringCoordinates;
						}
					}

					if(newFeature.geometry.coordinates.length > 0){
						features.push(newFeature);
					}
				}
				else {
					invalidFeatures.push[inputFeature];
				} 
			}
			else {
				invalidFeatures.push[inputFeature];
			}
		}
	}
	catch(e) {
		throw e;
	}

	var cleanFeatures = []
	for(var feature of features) {
		if(feature.geometry.coordinates.length > 1) 
			cleanFeatures.push(feature);
		else 
			invalidFeatures.push[feature];
    }
    
    return {clean:cleanFeatures, invalid:invalidFeatures};
}


export function cleanPoints(inputData) {
    var features = [];
	var invalidFeatures = [];
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
			invalidFeatures.push[inputData];
		}

		for(var inputFeature of inputFeatures) {

			if (inputFeature.geometry.type === "Point"){
				features.push(inputFeature);
			}
			else {
				invalidFeatures.push[inputFeature];
			}
		}
	}
	catch(e) {
		throw e;
	}
    
    return {clean:features, invalid:invalidFeatures};
}
