import Command from "@oclif/command";
import bodyParser from 'body-parser';
import express from 'express';
import Path from 'path';
import { matchLines } from "./match";
import { Graph, GraphMode } from "../graph";
import envelope from "@turf/envelope";
import { TilePathParams } from "../tiles";

export default class Server extends Command {
    static description = "run a local server to access the SharedStreets match tool via a REST API"
    run(): any {
        server();
    }
    
}

async function server() {
    const corsHeaders = {
        origin: ["*"],
        headers: ['Origin', 'X-Requested-With', 'Content-Type'],
        credentials: true,
        additionalHeaders: ['access-control-allow-headers', 'Access-Control-Allow-Origin, Access-Control-Allow-Headers, Origin, X-Requested-With, Content-Type, CORRELATION_ID'],
        additionalExposedHeaders: ['access-control-allow-headers', 'Access-Control-Allow-Origin, Access-Control-Allow-Headers, Origin, X-Requested-With, Content-Type, CORRELATION_ID']
    };

    const app = express(); 
    app.use(bodyParser.text());
    app.post("/match/geoms", async (req, res) => {
        console.log("POST match/geoms,\nrequest:")
        // console.log(req.query);
        // console.log(req.body);
        const query = req.query;
        const body = JSON.parse(req.body);
        console.log(query);
        console.log(body);
        // console.log(h);
        // matchLines({}, body, query);
        var params = new TilePathParams();
        // params.source = flags['tile-source'];
        params.source = null;
        // params.tileHierarchy = flags['tile-hierarchy']
        params.tileHierarchy = null;

        const extent = envelope(body);
        const matcher = new Graph(extent, params, GraphMode.CAR_ALL);
        await matcher.buildGraph();
    });
    app.listen(3001, () =>  {
        console.log('Server running at: http://localhost:3001/');
    });
}