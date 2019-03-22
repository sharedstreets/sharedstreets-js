import {Command, flags} from '@oclif/command'
import { watch, readFileSync } from 'fs';

import { TilePathParams, TileType, TilePathGroup } from '../tiles'
import { TileIndex } from '../tile_index'

const chalk = require('chalk');

export default class Intersects extends Command {
  static description = 'queries streets by polygon data and returns GeoJSON output of all intersecting features'

  static examples = [
    `$ shst intersects polygon.geojson --geometries
      {type:"FeatureCollection", features:[...]}
    `,
  ]

  static flags = {
    help: flags.help({char: 'h'}),
    // flag with a value (-n, --name=VALUE)
    name: flags.string({char: 'n', description: 'name to print'}),
    // flag with no value (-f, --force)
    force: flags.boolean({char: 'f'}),
  }

  static args = [{name: 'file'}]

  async run() {
    const {args, flags} = this.parse(Intersects)

    this.log(chalk.bold.keyword('green')('🌏 Loading polygon...'));

    var content = readFileSync(args.file);
    var polygon = JSON.parse(content.toLocaleString());
  
    this.log(chalk.bold.keyword('green')('🗄️ Loading SharedStreets tiles...'));
    var params = new TilePathParams();
    params.source = 'osm/planet-180430';
    params.tileHierarchy = 6;
    params.tileType = TileType.GEOMETRY;

    var tileIndex = new TileIndex();

    this.log(chalk.bold.keyword('green')('🔍 Searching data...'));
    var data = await tileIndex.intersects(polygon, params);

    console.log(JSON.stringify(data));
  }
}