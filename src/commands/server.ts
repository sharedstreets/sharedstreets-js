import Command from "@oclif/command";
import bodyParser from 'body-parser';
import express from 'express';
import Path from 'path';
import { matchLines } from "./match";

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
    app.post("/match/geoms", (req, res) => {
        console.log("POST match/geoms,\nrequest:")
        // console.log(req.query);
        // console.log(req.body);
        const query = req.query;
        const body = JSON.parse(req.body);
        console.log(query);
        console.log(body);
        // console.log(h);
        matchLines({}, body, query);
    });
    app.listen(3001, () =>  {
        console.log('Server running at: http://localhost:3001/');
    });
}