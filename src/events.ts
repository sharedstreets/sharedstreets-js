import * as probuf_minimal from "protobufjs/minimal";

import { ReferenceSideOfStreet, ReferenceDirection } from './matcher'

import * as turfHelpers from '@turf/helpers';
import lineOffset from "@turf/line-offset";
import turfBbox from '@turf/bbox';
import turfBboxPolygon from '@turf/bbox-polygon';

import {quantileRankSorted} from "simple-statistics"
import { IBooleanFlag } from "@oclif/parser/lib/flags";
import { each } from "benchmark";
import { TileIndex, getBinCountFromLength, getReferenceLength } from "./tile_index";
import { Feature, polygon } from "@turf/helpers";
import { Polygon } from "@turf/buffer/node_modules/@turf/helpers";
import { TilePathParams, TileType } from "./tiles";
import { SharedStreetsGeometry, SharedStreetsReference } from "sharedstreets-types";
import { lineInsidePolygon } from "./geom";

var linearProto = require('./proto/linear.js');

const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');

const chalk = require('chalk');

const tileHierarchy:number = 6;
const tileSource:string = 'osm';
const tileBuild:string = 'planet-180430';

const MIN_COUNT = 5;

//const TIMEZONE = 'America/New_York';


// convert refId + binCount and binPosition to ref
// [refId]-[binCount]:[binPosition]
export function generateBinId(referenceId, binCount, binPosition):string {
    var binId:string = referenceId + "{" + binCount;
    if(binPosition) 
        binId = binId + ":" + binPosition;
    return binId;
}   

export const weekTest = new RegExp("([12]\\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01]))");

export enum PeriodSize {
    OneSecond       = 0,
    FiveSeconds     = 1,
    TenSeconds      = 2,
    FifteenSeconds  = 3,
    ThirtySeconds   = 4,
    OneMinute       = 5,
    FiveMinutes     = 6,
    TenMinutes      = 7,
    FifteenMinutes  = 8,
    ThirtyMinutes   = 9,
    OneHour         = 10,
    OneDay          = 11,
    OneWeek         = 12,
    OneMonth        = 13,
    OneYear         = 14
}

class SharedStreetsBin {
    type:string;
    count:number;
    value:number;
}

class SharedStreetsLinearBins {

    referenceId:string;

    referenceLength:number;
    numberOfBins:number;

    bins:{};

    constructor(referenceId:string, referenceLength:number, numberOfBins:number) {
        this.referenceId = referenceId;
        this.referenceLength = referenceLength;
        this.numberOfBins = numberOfBins; // defaults to one bin
        this.bins = {};
    }

    getId():string {
        return generateBinId(this.referenceId, this.numberOfBins, null)
    }

    addBin(binPosition:number, type:string, count:number, value:number) {
        var bin = new SharedStreetsBin();
        bin.type = type;
        bin.count = count;
        bin.value = value;
        this.bins[binPosition] = bin;
    }
}



export class WeeklySharedStreetsLinearBins extends SharedStreetsLinearBins {

    periodSize:PeriodSize;

    constructor(referenceId:string, referenceLength:number, numberOfBins:number, periodSize:PeriodSize) {
        super(referenceId, referenceLength, numberOfBins);
        this.periodSize = periodSize;
    }

    addPeriodBin(binPosition:number, period:number, type:string, count:number, value:number) {

         var bin = new SharedStreetsBin();
        bin.type = type;
        bin.count = count;
        bin.value = value;
        
        if(!this.bins[binPosition]) {
            this.bins[binPosition] = {};
        }

        if(this.bins[binPosition][period]) {
            this.bins[binPosition][period].count += bin.count;
            this.bins[binPosition][period].value += bin.value;
        }
        else    
            this.bins[binPosition][period] = bin;
    }

    getFilteredBins(binPosition:number, typeFilter:string, periodFilter:Set<number>):SharedStreetsBin[] {
        
        var filteredBins = [];

        if(this.bins[binPosition]) {
            for(var period of Object.keys(this.bins[binPosition])) {
                if(periodFilter) {
                    if(!periodFilter.has(parseInt(period)))
                        continue;
                }
                if(typeFilter) {    
                    if(typeFilter !== this.bins[binPosition][period].type)
                        continue;
                }
                filteredBins.push(this.bins[binPosition][period]);
            }
        }
    
        return filteredBins;
    }

    getHourOfDaySummary(typeFilter:string, periodFilter:Set<number>) {

        var filteredBins = new Map<number,SharedStreetsBin[]>();

        for(var binPosition of Object.keys(this.bins)) {
            for(var period of Object.keys(this.bins[binPosition])) {

                var hourOfDay = (parseInt(period) % 24);
                if(hourOfDay > 24)
                    hourOfDay = hourOfDay - 24;
                if(hourOfDay <= 0)
                    hourOfDay = hourOfDay + 24;
                

                if(typeFilter) {
                    if(typeFilter !== this.bins[binPosition][period].type)
                        continue;
                }

                if(periodFilter) {
                    if(!periodFilter.has(parseInt(period)))
                        continue;
                }

                if(!filteredBins[hourOfDay])
                    filteredBins[hourOfDay] = [];

                filteredBins[hourOfDay].push(this.bins[binPosition][period]);
            }
        }
    
        return filteredBins;
    }

    getValueForBin(binPosition:number, typeFilter:string, periodFilter:Set<number>) {

        var sum = 0;
        var filteredBins = this.getFilteredBins(binPosition, typeFilter, periodFilter);

        for(var bin of filteredBins) {
            sum = sum + bin.value;
        }

        return sum;
    }

    getCountForHoursOfDay(typeFilter, periodFilter:Set<number>) {

        var summary = this.getHourOfDaySummary(typeFilter, periodFilter);

        var hourOfDayCount = {};

        for(var hourOfDay of Object.keys(summary)) {
            hourOfDayCount[hourOfDay] = 0;
            for(var bin of summary[hourOfDay]) {
                hourOfDayCount[hourOfDay] = hourOfDayCount[hourOfDay] + bin.count;
            }
        }
        
        return hourOfDayCount;
    }

    getCountForBin(binPosition:number, typeFilter:string, periodFilter:Set<number>) {

        var sum = 0;
        var filteredBins = this.getFilteredBins(binPosition, typeFilter, periodFilter);

        for(var bin of filteredBins) {
            sum = sum + bin.count;
        }

        return sum;
    }

    getCountForEdge(typeFilter:string, periodFilter:Set<number>) {

        var sum = 0;

        for(var binPosition = 0; binPosition < this.numberOfBins; binPosition++) {
            var filteredBins = this.getFilteredBins(binPosition, typeFilter, periodFilter);

            for(var bin of filteredBins) {
                sum = sum + bin.count;
            }
        }
    
        return sum;
    }
}

class BinReferenceData {
    geometry;
    refLength;
}

export class EventData {


    dataDirectory:string;
    data:Map<string, Map<string, WeeklySharedStreetsLinearBins>>;
    tileIndex:TileIndex;
    summary:Map<string, number>;
    params:TilePathParams;

    constructor(dir:string, tileIndex:TileIndex=null) {

        this.params = new TilePathParams();
        this.params.source = 'osm/planet-180430';
        this.params.tileHierarchy = 6;

        this.dataDirectory = dir;
        this.data = new Map();
        this.summary = new Map();

        if(tileIndex) 
            this.tileIndex = tileIndex;
        else 
            this.tileIndex = new TileIndex();
        
        var weeks = this.getWeeks();

        if(weeks.length > 0) {

            console.log(chalk.bold.keyword('green')('  📅  Found ' + weeks.length + ' weeks of data'));
            console.log(chalk.bold.keyword('green')('  🌏  Loading tile data...'));

            for(var week of weeks) {
                this.loadTiles(week);
            } 

        } else {
            console.log(chalk.bold.keyword('green')('  📅  No weekly data found.'));
            this.loadTiles('');
        }
       
        console.log([...this.summary.keys()]);
    }

    loadTiles(week:string) {

        console.log("loading: " + week);
        var weekDirectory = path.join(this.dataDirectory, week);
        for(var file of fs.readdirSync(weekDirectory)) {
            if(file.endsWith('.pbf')) {   
                //console.log(week + "-- file: " + file);
                var tilePath = path.join(weekDirectory, file);
                this.processWeeklyLinearBinsTile(tilePath, week);
                //
            }
        }
        console.log("number edges: "  + this.data.get(week).size);
    }

    processWeeklyLinearBinsTile(tilePath, week:string) {

        if(!this.data.has(week)) {
            this.data.set(week, new Map());
        }

        var offset = 0;

        if(week != '') {
            // shifted timeszone calc to filter/pre-processing step...
            // var localTimeZone = moment.tz(week + " 12:00", TIMEZONE);
            // localTimeZone.utcOffset()
            // offset = Math.round(localTimeZone.utcOffset() / 60);
        }   
        
        var buffer = fs.readFileSync(tilePath);
        var reader = probuf_minimal.Reader.create(buffer);

        while (reader.pos < reader.len) {
            try {
                var result = linearProto.SharedStreetsWeeklyBinnedLinearReferences.decodeDelimited(reader)
                
                var linearBins:WeeklySharedStreetsLinearBins;
                
                if(this.data.get(week).has(result.referenceId)) 
                    linearBins = this.data.get(week).get(result.referenceId)
                else
                    linearBins = new WeeklySharedStreetsLinearBins(result.referenceId, result.referenceLength, result.numberOfBins, PeriodSize.OneHour);
        
                for(var i = 0; i < result.binPosition.length; i++) {
                    var binPosition = result.binPosition[i];

                    for(var j = 0; j < result.binnedPeriodicData[i].bins.length; j++) {

                        var period = result.binnedPeriodicData[i].periodOffset[j] + offset;
                        var bin = result.binnedPeriodicData[i].bins[j];

                        for(var h in bin.dataType) {

                            var dataType = bin.dataType[h].toLocaleLowerCase();
                            var binCount = parseInt(bin.count[h]);
                            var binValue = parseInt(bin.value[h]);

                            if(!this.summary.has(dataType))
                                this.summary.set(dataType, binCount);
                            else
                                this.summary.set(dataType, this.summary.get(dataType) + binCount);

                            linearBins.addPeriodBin(binPosition, period, dataType, binCount, binValue)
                        }
                    }
                }

                this.data.get(week).set(result.referenceId, linearBins);
            }
            catch(e) {
                console.log(e);
            }
        }
    }

    getWeeks():string[] {
        var weeks:string[] = [];
        for(var file of fs.readdirSync(this.dataDirectory)) {
            if(fs.statSync(path.join(this.dataDirectory, file)).isDirectory() && weekTest.test(file))
                weeks.push(file);
        }
        return weeks;
    }
    

    getTypes():string[] {
        return [...this.summary.keys()];
    }

    async *getRank(extent:turfHelpers.Feature<Polygon>, weeks:string[], typeFilter, periodFilter:Set<number>) {
        
        var results = turfHelpers.featureCollection([]);
           
        for(var type of typeFilter) {

            var offset = 5;
            if(type['offset'])
                offset = type['offset'];

            const getEdgeForRefId = (refId) => {

                var shstRef:SharedStreetsReference = <SharedStreetsReference>this.tileIndex.objectIndex.get(refId);
                var refLength = getReferenceLength(shstRef);

                if(!typeFilter || typeFilter.length == 0) {
                    typeFilter = [{type:null}]
                }

                var hasData = null;
                for(var week of weeks) {
                    hasData = this.data.get(week).has(refId);
                    if(hasData)
                        break;
                }
                var geoms = [];
                if(hasData) {   
                        var edgeCount = 0;
                        for(var week of weeks) {    
                            if(this.data.has(week)) {
                                var weeklyData = this.data.get(week).get(refId);
                                if(weeklyData) {
                                    edgeCount += weeklyData.getCountForEdge(typeFilter['type'], periodFilter);
                                }
                            }
                        }

                        if(edgeCount > MIN_COUNT) {
                            var geom = this.tileIndex.referenceToOffsetLine(refId, offset, ReferenceSideOfStreet.RIGHT);
                            geom.properties['edgeCount'] = edgeCount / refLength;
                            
                            if(type['type'])
                                geom.properties['type'] = type['type'];
                            
                            geoms.push(geom);
                        }
                
                }
                return geoms;
            }

            var edgeCollection = turfHelpers.featureCollection([]);
            var edgeCounts = [];
            var geoms = await this.tileIndex.intersects(extent, TileType.GEOMETRY, this.params, [TileType.REFERENCE]);

            for(var geom of geoms.features) {

                if(!lineInsidePolygon(<turfHelpers.Feature<turfHelpers.LineString>>geom, extent))
                    continue;

                var shstGeom = <SharedStreetsGeometry>this.tileIndex.objectIndex.get(geom.properties.id);
                
                if(shstGeom.forwardReferenceId) {
                    var edges = getEdgeForRefId(shstGeom.forwardReferenceId);
                    if(edges.length > 0) {
                        for(var edge of edges) {
                            edgeCounts.push(edge.properties['edgeCount']);
                            edgeCollection.features.push(edge);
                        }
                    }       
                }

                if(shstGeom.backReferenceId) {
                    var edges = getEdgeForRefId(shstGeom.backReferenceId);
                    if(edges.length > 0) {
                        for(var edge of edges) {
                            edgeCounts.push(edge.properties['edgeCount']);
                            edgeCollection.features.push(edge);
                        }
                    }       
                }
            }

            var sortedEdgeCounts = edgeCounts.sort(function(a,b) { return a - b; });       
            for(var unfilteredEdge of edgeCollection.features) {
                var rank:number = quantileRankSorted(sortedEdgeCounts, unfilteredEdge.properties['edgeCount']);
                if(rank > 0.5) {
                    unfilteredEdge.properties['rank'] = Math.round(rank * 100) / 100;
                    delete unfilteredEdge.properties['edgeCount'];
                    yield unfilteredEdge;
                }
            }
        }
    }


    async *getBins(extent:turfHelpers.Feature<Polygon>, weeks:string[], typeFilter, periodFilter:Set<number>) {

        var totalCount:Map<string,number> = new Map();

        const getBinsForRefId = (refId) =>  {
            var shstRef:SharedStreetsReference = <SharedStreetsReference>this.tileIndex.objectIndex.get(refId);
            
            if(!typeFilter || typeFilter.length == 0) {
                typeFilter = [{type:null}]
            }

            var defaultRef = null;

            for(var week of weeks) {
                if(this.data.get(week).has(refId)) {
                    defaultRef = this.data.get(week).get(refId);
                    if(defaultRef)
                        break;
                }
            }

            if(defaultRef)  {

                var refLength = getReferenceLength(shstRef);
                var binLength = refLength / defaultRef.numberOfBins;
                var numberOfBins = getBinCountFromLength(refLength, 10);

                var binPointCollection = turfHelpers.featureCollection([]);
                for(var type of typeFilter) {
                    var offset = 5;
                    if(type['offset'])
                        offset = type['offset'];


                    if(!totalCount.has(type['type']))
                        totalCount.set(type['type'], 0);


                    var bins = this.tileIndex.referenceToBins(refId, numberOfBins, offset, ReferenceSideOfStreet.RIGHT);

                    var binPoints:turfHelpers.Point[] = [];
                    
                    for(let i = 0; i <  bins.geometry.coordinates.length; i++) {
                        
                        var binPoint = turfHelpers.point(bins.geometry.coordinates[i]);
                        var binPosition = i + 1;

                        var binValue = 0;
                        var binCount = 0;
                        for(var week of weeks) {    
                            if(this.data.has(week) && this.data.get(week).has(refId)) {
                                var weeklyData = this.data.get(week).get(refId);
                                if(weeklyData) {
                                    binValue += weeklyData.getValueForBin(binPosition, type['type'], periodFilter);
                                    binCount += weeklyData.getCountForBin(binPosition, type['type'], periodFilter); 

                                    totalCount.set(type['type'], totalCount.get(type['type']) + weeklyData.getCountForBin(binPosition, type['type'], periodFilter));
                                }
                            }
                        }   

                        if(binCount > MIN_COUNT) {
                            var periodAverageCount =  binCount / (periodFilter.size * weeks.length);
                            // reduce decimal precision for transport
                            periodAverageCount= Math.round(periodAverageCount * 10000) / 10000;
        
                            binPoint.id = generateBinId(refId, numberOfBins, binPosition);
                            binPoint.properties['periodAverageCount'] = periodAverageCount;
                            binPoint.properties['refId'] = refId; 
                            binPoint.properties['binPos'] = binPosition; 

                            if(type['color'])
                                binPoint.properties['color'] = type['color'];
                            
                            binPoint.properties['type'] = type['type'];
        
                            if(periodAverageCount )
                                binPointCollection.features.push(binPoint);
                        }              
                    }
                }

                return binPointCollection;
            } 
        };

        var binPointCollection = turfHelpers.featureCollection([]);
        var geoms = await this.tileIndex.intersects(extent, TileType.GEOMETRY, this.params, [TileType.REFERENCE]);

        for(var geom of geoms.features) {

            if(!lineInsidePolygon(<turfHelpers.Feature<turfHelpers.LineString>>geom, extent))
                continue;

            var shstGeom = <SharedStreetsGeometry>this.tileIndex.objectIndex.get(geom.properties.id);
            
            if(shstGeom.forwardReferenceId) {
                
                var bins = getBinsForRefId(shstGeom.forwardReferenceId);
                if(bins) {
                    for(var bin of bins.features) {
                        yield bin;
                    }
                } 
            }

            if(shstGeom.backReferenceId) {
                var bins = getBinsForRefId(shstGeom.backReferenceId);
                if(bins) {
                    for(var bin of bins.features) {
                        yield bin;
                    }
                }
            }
        }

        for(var type of totalCount.keys()) {
            console.log(' ' + type + ': ' + totalCount.get(type))
        }  
    }

    async getSummary(extent:turfHelpers.Feature<Polygon>, weeks, typeFilter, periodFilter) {

        var summary:Map<string,Map<string, number>> = new Map();
        var totalBinCount = 0;

        const dailySummary = (refId) => {

            if(!typeFilter || typeFilter.length == 0) {
                typeFilter = [{type:null}]
            }

            var defaultRef = null;

            for(var week of weeks) {
                defaultRef = this.data.get(week).get(refId);
                if(defaultRef) {
                    var shstRef = <SharedStreetsReference>this.tileIndex.objectIndex.get(refId);
                    var refLength = getReferenceLength(shstRef);
                    var binLength = refLength / defaultRef.numberOfBins;

                    var numberOfBins = getBinCountFromLength(refLength, 10);

                    totalBinCount += numberOfBins;

                    break;
                }
                    
            }

            var data = this.data.get(week).get(shstGeom.forwardReferenceId)
                if(data) {
                    for(var type of typeFilter) {
                        var hourOfDayCount = data.getCountForHoursOfDay(type['type'], periodFilter);

                        for(var hourOfDay of Object.keys(hourOfDayCount)) {

                            if(!summary.has(type['type']))
                                summary.set(type['type'], new Map());
                            
                            if(!summary.get(type['type']).has(hourOfDay))
                                summary.get(type['type']).set(hourOfDay, 0);
                        
                            if(hourOfDayCount[hourOfDay] > 0)
                                summary.get(type['type']).set(hourOfDay, summary.get(type['type']).get(hourOfDay) + hourOfDayCount[hourOfDay]);
                        }
                    }
                }
        }

        var geoms = await this.tileIndex.intersects(extent, TileType.GEOMETRY, this.params, [TileType.REFERENCE]);

        for(var geom of geoms.features) {

            if(!lineInsidePolygon(<turfHelpers.Feature<turfHelpers.LineString>>geom, extent))
                    continue;
                    
            var shstGeom = <SharedStreetsGeometry>this.tileIndex.objectIndex.get(geom.properties.id);

            if(shstGeom.forwardReferenceId) {
                dailySummary(shstGeom.forwardReferenceId);
            }

            if(shstGeom.backReferenceId) {
                dailySummary(shstGeom.backReferenceId);
            }
        }

        // pivot and normalize values
        var result = {}
        for(var h = 1; h < 25; h++) {
            var hourString = '' + h;
            
            for(var dataType of summary.keys()) {  

                if(!result[dataType])
                    result[dataType] = [];

                if(summary.has(dataType) && summary.get(dataType).has(hourString)) {
                    var hourlyRate = summary.get(dataType).get(hourString) / periodFilter.size / totalBinCount;
                    result[dataType].push(hourlyRate);
                }
                else 
                    result[dataType].push(0);

            }
        }

        return result;
    }
}
