
import fetch from 'node-fetch';

export async function getJson(url):Promise<{}> {

    var data = await fetch(url, { 
        method: 'GET'
    });

    return data.json();
}

export async function getPbf(url):Promise<Uint8Array> {

    var data = await fetch(url, { 
        method: 'GET'
    });

    return new Uint8Array(await data.buffer());
}