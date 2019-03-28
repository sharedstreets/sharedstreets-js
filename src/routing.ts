
import distance from '@turf/distance';
import * as turfHelpers from '@turf/helpers';
const jkstra = require('jkstra');

class PathStackFrame {
    
    static defaultOptions = {
        direction: jkstra.OUT,
        edgeCost: (e, costDone) => 1,
        edgeFilter: null    // take all edges
    }
    
    graph;
    edges;
    options;

    edge;
    startEdgeCost;
    currentEdgeCost;
    visitedNodes = [];


    constructor(graph, start, startCost, visitedNodes, options) {
        this.graph = graph;
        this.options = options;
        this.startEdgeCost = startCost; 
        this.visitedNodes = JSON.parse(JSON.stringify(visitedNodes));

        this.edges = this.graph.incidentEdges(start, jkstra.OUT, this.options.edgeFilter);
    } 

    nextEdge() {
        if(this.edges.length > 0) {
            this.edge = this.edges.pop();
            this.currentEdgeCost = this.options.edgeCost(this.edge);
            this.visitedNodes[this.edge.from.data] = true;
            return this.edge;
        }
        else
            return null;
    }
    
    isVisited(node) {
        return this.visitedNodes[node.data] == true ? true : false;
    }

    getCurrentEdge() {
        return this.edge;
    } 

    getTotalEdgeCost() {
        return this.startEdgeCost + this.currentEdgeCost;
    }
}

export class PathSearch {

    graph;
    start;
    end; 
    min;
    max;
    options; 
    minCost = []

    constructor(graph) {
        this.graph = graph;
    }

    findPath(start, end, endCoord:turfHelpers.Coord, min, max, options) {
        var results = [];
        
        var stack = [];
        var visitedNodes = {};

        stack.push(new PathStackFrame(this.graph, start, 0, visitedNodes, options));
        var currentStackFrame = stack[0];

        while(stack.length > 0) {
            var nextEdge;
            while(nextEdge = currentStackFrame.nextEdge()) {
                
                var remainingDistance = distance(nextEdge.data.start, endCoord, {'units':'meters'})

                if((currentStackFrame.getTotalEdgeCost() - currentStackFrame.currentEdgeCost > 0 ) && currentStackFrame.getTotalEdgeCost() - currentStackFrame.currentEdgeCost + remainingDistance > max) {
                    continue;
                }
                else if(nextEdge.to.data == end.data) {
                    if(currentStackFrame.getTotalEdgeCost() < max && currentStackFrame.getTotalEdgeCost() > min) {
                        var path = stack.map((e) => {return e.edge.data.id});
                        results.push({path:path, length:currentStackFrame.getTotalEdgeCost()});
                    }
                    else 
                        continue; // path found but too short...
                }
                else {
                    if(!currentStackFrame.isVisited(nextEdge.to)) {
                        currentStackFrame = new PathStackFrame(this.graph, nextEdge.to, currentStackFrame.getTotalEdgeCost(), currentStackFrame.visitedNodes,  options);
                        stack.push(currentStackFrame);
                    }   
                }

            }

            var lastFrame = stack.pop();
            //minCost[lastFrame.edge.from] = lastFrame.minCost;
            currentStackFrame = stack[stack.length-1];
        }
        return results;
    }
}
