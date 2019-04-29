
// class ExtendableSharedStreetsGeometryProperties {
//     id:string;
//     roadClass:RoadClass;
//     metadata:SharedStreetsMetadata;
//     forwardReference:SharedStreetsReference;
//     backReference:SharedStreetsReference;
//     toIntersection:SharedStreetsIntersection;
//     fromIntersection:SharedStreetsIntersection;

//     constructor() {
//         this.id = null;
//         // this.roadClass = null;
//         // this.metadata = null;
//         // this.forwardReference = null;
//         // this.backReference = null;
//         // this.toIntersection = null;
//         // this.fromIntersection = null;
//     }
// }

// export class ExtendableSharedStreetsGeometry implements Feature<Geometry> {
//     type;
//     geometry;
//     properties:ExtendableSharedStreetsGeometryProperties;

//     constructor(geom:ExtendableSharedStreetsGeometry) {
//         this.geometry = null;
//         this.properties = new ExtendableSharedStreetsGeometryProperties();

//         if(geom){
//             this.type = "Feature";
//             this.geometry = geom.geometry;
//             this.properties = Object.assign(this.properties, geom.properties);
//         }
//     }

//     isGeomSame(otherGeom:ExtendableSharedStreetsGeometry):boolean {
//         if(this.properties.id !== otherGeom.properties.id)
//             return false;
//         if(this.properties.forwardReference.id !== otherGeom.properties.forwardReference.id)
//             return false;
        
//         return true;
//     }

//     isRefSame(otherGeom:ExtendableSharedStreetsGeometry):boolean {
//         // XOR backReference -- coerce undefined
//         if(!this.properties.backReference != !otherGeom.properties.backReference)
//             return false;

//         if(this.properties.backReference && this.properties.backReference.id !== otherGeom.properties.backReference.id)
//             return false;

//         return true;
//     }

//     isSame(otherGeom:ExtendableSharedStreetsGeometry):boolean {
//         if(!this.isGeomSame(otherGeom))   
//             return false;
        
//         if(!this.isRefSame(otherGeom))   
//             return false;
        
//         return true;
//     }
// }

// export enum MatchType {
//     UNMATCHED = "unmatched",
//     UNCHANGED = "unchanged",
//     MATCHED_REF_CHANGED = "matched_ref_changed",
//     MATCHED_GEOM_CHANGED = "matched_geom_changed",
//     MATCHED_CANDIDATES = "matched_candidates",
// }


// class MatchedSharedStreetsGeometryProperties extends ExtendableSharedStreetsGeometryProperties{
    
//     matchType:MatchType;
//     matchedGeom:ExtendableSharedStreetsGeometry;
//     matchedForwardCandidateSegments:PathSegment[];
//     forwardCandidateScore:number;
//     matchedBackCandidateSegments:PathSegment[];
//     backCandidateScore:number;

//     constructor() {
//         super()
//     }
// }

// export class MatchedSharedStreetsGeometry extends ExtendableSharedStreetsGeometry {

//     properties:MatchedSharedStreetsGeometryProperties

//     constructor(geom1:ExtendableSharedStreetsGeometry) {
//         super(geom1);
//     }
// }

// export class SharedStreetsGeometryWithMetadataCollection {
//     data:ExtendableSharedStreetsGeometry[];

//     intersectionIdIndex = new Map<string,SharedStreetsIntersection>();
//     referencedIdIndex = new Map<string,SharedStreetsReference>();
//     geometryIdIndex = new Map<string,ExtendableSharedStreetsGeometry>(); 

//     constructor(data:ExtendableSharedStreetsGeometry[]) {
//         this.data = data;
//         for(var item of data) {
//             this.geometryIdIndex.set(item.properties.id, item);
            
//             this.intersectionIdIndex.set(item.properties.fromIntersection.id, item.properties.fromIntersection);
//             this.intersectionIdIndex.set(item.properties.toIntersection.id, item.properties.toIntersection);

//             this.referencedIdIndex.set(item.properties.forwardReference.id, item.properties.forwardReference);
//             if(item.properties.backReference)
//                 this.referencedIdIndex.set(item.properties.backReference.id, item.properties.backReference);
            
//         }
//     }   

//     async getMatch(feature1:ExtendableSharedStreetsGeometry, cache:LocalCache, matchTileBuild:string, matchTileHierarchy:number):Promise<MatchedSharedStreetsGeometry> {
//         var matchedGeom = new MatchedSharedStreetsGeometry(feature1);
//         if(this.geometryIdIndex.has(feature1.properties.id)) {
            
//             var feature2 = this.geometryIdIndex.get(feature1.properties.id);

//             if(feature1.isSame(feature2)) {
//                 // matched + UNCHANGED
//                 matchedGeom.properties.matchType = MatchType.UNCHANGED;
//                 matchedGeom.properties.matchedGeom = feature2;
//                 return matchedGeom;
//             }

//             // method 1: check geomId + ref changes (e.g. 2-way -> 1-way)
//             if(feature1.isGeomSame(feature2)) {
//                 if(!feature1.isRefSame(feature2)) {
//                     matchedGeom.properties.matchType = MatchType.MATCHED_REF_CHANGED;
//                     matchedGeom.properties.matchedGeom = feature2;
//                     return matchedGeom;
//                 }
//             }

//         }
//         else {
            
//             // not an exact match try fallback methods 
//             // method 2: uses referenceIds

//             var ref1:SharedStreetsReference = this.referencedIdIndex.get(feature1.properties.forwardReference.id);

//             if(ref1) {
//                 matchedGeom.properties.matchType = MatchType.MATCHED_GEOM_CHANGED;
//                 matchedGeom.properties.matchedGeom = this.geometryIdIndex.get(ref1.geometryId);
//                 return matchedGeom;
//             }

//             if(feature1.properties.backReference) {
//                 var ref2:SharedStreetsReference = this.referencedIdIndex.get(feature1.properties.backReference.id);

//                 if(ref2) {
//                     matchedGeom.properties.matchType = MatchType.MATCHED_GEOM_CHANGED;
//                     matchedGeom.properties.matchedGeom = this.geometryIdIndex.get(ref2.geometryId);
//                     return matchedGeom;
//                 }
//             }
            

//             // method 3: use matcher
            
//             // TODO allow setting matcher config 
//             var matcher = new Matcher(cache);
//             matcher.bearingTolerance = 45;
//             matcher.snapToIntersections = true;
//             matcher.tileBuild = matchTileBuild;
//             matcher.tileHierarchy = matchTileHierarchy;
//             matcher.tileSource = "osm";


//             var sortCandidates = (l) => {

//                 return l.sort((p1:PathCandidate, p2:PathCandidate) => {
//                 p1.calcScore();
//                 p2.calcScore();	
    
//                 if(p1 && p2 && p1.score > p2.score) {
//                     return 1;
//                 }
//                 else if(p1 && p2 && p1.score < p2.score) {
//                     return -1;
//                 }
//                 else {
//                     if(p1 && p2 && p1.sideOfStreet == ReferenceSideOfStreet.UNKNOWN && p2.sideOfStreet != ReferenceSideOfStreet.UNKNOWN)
//                         return 1;
//                     if(p1 && p2 && p2.sideOfStreet == ReferenceSideOfStreet.UNKNOWN && p1.sideOfStreet != ReferenceSideOfStreet.UNKNOWN)
//                         return -1;	
//                     else
//                         return 0;
//                 }
    
//             })};

//             var forwardCandidates = await matcher.getCandidatesForRef(feature1.properties.forwardReference, feature1, null)
//             var sortedForwardCandidates = sortCandidates(forwardCandidates);

            
//             var sortedBackwardCandidates = [];
//             if(feature1.properties.backReference) { 
//                 var backwardCandidates = [];
//                 backwardCandidates = await matcher.getCandidatesForRef(feature1.properties.backReference, feature1, null);
//                 sortedBackwardCandidates = sortCandidates(backwardCandidates);
//             }
            
//             matchedGeom.properties.matchedForwardCandidateSegments = [];
//             matchedGeom.properties.matchedBackCandidateSegments = [];
               
//             if(sortedForwardCandidates.length > 0) {
//                 for(var pathSegment of sortedForwardCandidates[0].segments) {
//                     matchedGeom.properties.matchedForwardCandidateSegments.push(pathSegment);
//                 }
//                 matchedGeom.properties.matchType = MatchType.MATCHED_CANDIDATES;
//                 matchedGeom.properties.forwardCandidateScore = sortedForwardCandidates[0].calcScore();
//             }
            
            
//             if(sortedBackwardCandidates.length != 0) {
//                 for(var pathSegment of sortedBackwardCandidates[0].segments) {
//                     matchedGeom.properties.matchedBackCandidateSegments.push(pathSegment);
//                 }
//                 matchedGeom.properties.matchType = MatchType.MATCHED_CANDIDATES;
//                 matchedGeom.properties.backCandidateScore = sortedBackwardCandidates[0].calcScore();
//             }

//             if(matchedGeom.properties.matchType == MatchType.MATCHED_CANDIDATES)
//                 return matchedGeom;
            
//         }   
//         matchedGeom.properties.matchType = MatchType.UNMATCHED;
//         return matchedGeom;
//     }
// }