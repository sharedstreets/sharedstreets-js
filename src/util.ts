import fetch from 'node-fetch';


function checkStatus(res) {
    if (res.ok) { // res.status >= 200 && res.status < 300
        return res;
    } else {
        throw "file not found";
    }
}

export async function getJson(url):Promise<{}> {

    var data = await fetch(url, { 
        method: 'GET'
    });

    checkStatus(data);

    return data.json();
}

export async function getPbf(url):Promise<Uint8Array> {

    var data = await fetch(url, { 
        method: 'GET'
    });

    checkStatus(data);

    return new Uint8Array(await data.buffer());
}


export function rmse(values:number[]):number {
    var sum = 0;
    for(var value of values) {
        sum = sum + Math.pow(value, 2);
    }
    var mean = sum / values.length;
    return Math.sqrt(mean);
}