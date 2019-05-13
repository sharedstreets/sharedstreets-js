import {Command, flags} from '@oclif/command'
import { readFileSync, writeFileSync } from 'fs';

import { TilePathParams, TileType, TilePathGroup } from '../index'
import { TileIndex } from '../index'

import geomLength from '@turf/length';

const chalk = require('chalk');

export default class Extract extends Command {
  static description = 'extracts SharedStreets streets using polygon boundary and returns GeoJSON output of all intersecting features'

  static examples = [
    `$ shst extract polygon.geojson --out=output.geojson
  🌏 Loading polygon...
  🗄️ Loading SharedStreets tiles...
  🔍 Searching data...
    `,
  ]

  static flags = {
    help: flags.help({char: 'h'}),

    out: flags.string({char: 'o', description: 'output file'}),
    'tile-source': flags.string({description: 'SharedStreets tile source', default: 'osm/planet-181224'}),
    'tile-hierarchy': flags.integer({description: 'SharedStreets tile hierarchy', default: 6}),
    metadata: flags.boolean({description: 'Include SharedStreets OpenStreetMap metadata in output', default: false}),
    tiles: flags.boolean({description: 'Export list of tiles intersecting with bounding box', default: false})

  }

  static args = [{name: 'file'}]

  async run() {
    const {args, flags} = this.parse(Extract)

    if(flags.out)
      this.log(chalk.bold.keyword('green')('  🌏  Loading polygon...'));

    var inFile = args.file;

    var content = readFileSync(inFile);
    var polygon = JSON.parse(content.toLocaleString());

    var outFile = flags.out;

    if(!outFile) 
      outFile = inFile;

    if(outFile.toLocaleLowerCase().endsWith(".geojson"))
      outFile = outFile.split(".").slice(0, -1).join(".");
  

    this.log(chalk.bold.keyword('green')('  🗄️  Loading SharedStreets tiles...'));

    var params = new TilePathParams();
    params.source = flags['tile-source'];
    params.tileHierarchy = flags['tile-hierarchy']

    var tileIndex = new TileIndex();

    this.log(chalk.bold.keyword('green')('  🔍  Searching data...'));

    if(flags.metadata)
      tileIndex.addTileType(TileType.METADATA)

    var data = await tileIndex.intersects(polygon, TileType.GEOMETRY, 0,  params);

    for(var feature of data.features) {
      var geometryProperties = tileIndex.objectIndex.get(feature.properties.id);
      feature.properties = geometryProperties;

      if(flags.metadata) {
        feature.properties.metadata = tileIndex.metadataIndex.get(feature.properties.id)
      }
    }

    console.log(chalk.bold.keyword('blue')('  ✏️  Writing ' + data.features.length + ' features to: ' + outFile + '.out.geojson'));
    var jsonOut = JSON.stringify(data);
    writeFileSync(outFile + '.out.geojson', jsonOut);


    if(flags['tiles']) {
      var tiles = Array.from(tileIndex.tiles.values());
      console.log(chalk.bold.keyword('blue')('  ✏️  Writing ' + tiles.length + ' tile paths to: ' + outFile + '.tiles.txt'));
      writeFileSync(outFile + '.tiles.txt', tiles.join('\n'));
    }
  }
}