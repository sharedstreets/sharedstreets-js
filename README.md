# SharedStreets (Node.js & JavaScript)

[![npm version](https://badge.fury.io/js/sharedstreets.svg)](https://badge.fury.io/js/sharedstreets)
[![CircleCI](https://circleci.com/gh/sharedstreets/sharedstreets-js.svg?style=svg)](https://circleci.com/gh/sharedstreets/sharedstreets-js)

Node.js & JavaScript implementation of [SharedStreets Reference System](https://github.com/sharedstreets/sharedstreets-ref-system).

# SharedStreets (Node.js & JavaScript)

[![npm version](https://badge.fury.io/js/sharedstreets.svg)](https://badge.fury.io/js/sharedstreets)
[![CircleCI](https://circleci.com/gh/sharedstreets/sharedstreets-js.svg?style=svg)](https://circleci.com/gh/sharedstreets/sharedstreets-js)

Node.js & JavaScript implementation of [SharedStreets Reference System](https://github.com/sharedstreets/sharedstreets-ref-system).

# Command Line Interface (CLI)

## Description

The CLI is the primary tool for users to match GIS data to SharedStreets. The CLI is installed and run locally. Compared to the hosted API, the CLI can process much larger datasets and runs more quickly.

The CLI is currently runs on macOS and Linux. It does not (yet) support Windows.

Usage:
```sh
shst <command> [options ... ]
```

For detailed examples of how to use this tool, see the [SharedStreets blog](www.medium.com/sharedstreets).

## Install

The CLI can be easily installed using either `npm` or `yarn`.

To install using `npm`:

```sh
npm install -g sharedstreets
```
To install using `yarn`:
```sh
yarn global add sharedstreets
```
This will install the CLI as `shst`.

## Available commands

Available commands include:
- **extract**: extracts SharedStreets streets using polygon boundary and returns GeoJSON output of all intersecting features (this includes features that are in but not fully contained by the polygon)
- **help**: displays help for `shst`
- **match**: matches point and line features to SharedStreets references

### extract
Extracts SharedStreets streets using polygon boundary and returns GeoJSON routput of all intersecting features from the SharedStreets reference tile set.

The input polygon(s) must be in GeoJSON format, using the WGS84 datum (EPSG:4326) in decimal degrees. "Extracts" includes features that are inside but not fully contained by the polygon.

Output is given as a GeoJSON file:
- `[output filename].geojson`: contains features that intersected with the input polygon, including the SharedStreets ReferenceID

#### Usage:
```sh
shst extract <input polygon> [options]
```

### help
Displays help for `shst`

#### Usage:
```sh
shst help
```

#### Options:
The following options may be appended to the command:
- **-h, --help**: displays help for the `intersects` command
- **-o, --out=[filename.geojson]**: names the output file and allows user to place it in a different location
- **-s, --stats**: not sure

#### Example:
```sh
shst intersects ~/Desktop/project/city_boundary.geojson --out=streets_in_city.geojson
```


### match
Matches point and line features, from GIS, to SharedStreets references. This can be used to match city centerlines, parking meters, and other street features. Input data must be in GeoJSON format, using the WGS84 datum (EPSG:4326) in decimal degrees. Any standard GIS program (e.g. ArcGIS, QGIS) can convert from more common GIS file formats, like shapefile and geodatabase, into GeoJSON.

Output is given as up to three GeoJSON files:
- `[output filename].matched.geojson`: contains features that matched, including the SharedStreets IDs and properties, as well as the original properties of the matched features (by default)
- `[output filename].unmatched.geojson`: contains any unmatched features, if applicable
- `[output filename].invalid.geojson`: contains any invalid input data, if applicable

#### Usage:
```sh
shst match <input data> [options]
```

#### Options:

Additional options allow users to change the modality for matching, incorporate a city's directionality information to support better matching, snap or offset results, cluster points along a street section, etc.

The following options may be appended to the command:
- **-h, --help**: displays help for the `intersects` command
- **-o, --out=[filename.geojson]**: names the output file and allows user to place it in a different location
- **-p, --skip-port-properties**: do not port input feature properties into the matched output (these are output fields normally preceeded by "pp_")
- **--bearing-field=[bearing field]**: [default: bearing] name of optional point property containing bearing in decimal degrees. If converting from GIS, this is the name of the appropriate field in the attribute table. Example: `--bearing-field=degrees`.
- **--best-direction**: only match one direction, based on best score
- **--cluster-points=[number of meters]**: target sub-segment length for clustering points (in meters). Since road segments will rarely divide evenly into the target length, actual lengths may vary slightly from the target.
- **--direction-field=[direction field]**: name of optional line property describing segment directionality. Use in conjunction with the related `one-way-*-value` and `two-way-value` properties
- **--follow-line-direction**: only match using line direction
- **--left-side-driving**: directionality assumes left-side driving
- **--match-bike**: match using bike routing rules in [OSRM](http://project-osrm.org/), which excludes motorways and includes features like off-street paths
- **--match-car**: matching will use car routing rules in [OSRM](http://project-osrm.org/)
- **--match-motorway-only**: only match against motorway segments
- **--match-pedestrian**: match using pedestrian routing rules
- **--match-surface-streets-only**: only match against surface street segments
- **--offset-line=[offset in meters]**: offset geometry based on direction of matched line (in meters). This visually offsets the result to make it easier to see on a map (for example, could be used for sidewalks and curbs).
- **--one-way-against-direction-value=[one-way-against-direction value]**: name of optional value of `direction-field` indicating a one-way street against line direction
- **--one-way-with-direction-value=one-way-with-direction value**: name of optional value of `direction-field` indicating a one-way street with line direction
- **--search-radius=[number of meters]**: [default: 10] the search radius, in meters, for snapping points, lines, and traces to the street
- **--snap-intersections**: snap line end-points to nearest intersection
- **--snap-side-of-street**: snap line to side of street
- **--tile-hierarchy=[number]**: [default: 6] SharedStreets tile hierarchy, which refers to the [OSM data model](https://github.com/sharedstreets/sharedstreets-builder/blob/a554983e96010d32b71d7d23504fa88c6fbbad10/src/main/java/io/sharedstreets/tools/builder/osm/model/Way.java#L61). Level 6 includes unclassified roads and above. Level 7 includes service roads and above. Level 8 includes other features, like bike and pedestrian paths.
- **--tile-source=[osm/planet-DATE]**: [default: osm/planet-181224] SharedStreets tile source, which is derived from OSM at the date specified (in `yymmdd` format). A new tile source is created roughly once a month and a list can be found [here](https://github.com/sharedstreets/sharedstreets-api_).
- **--two-way-value=[two-way-value]**: name of optional value of `direction-field` indicating a two-way street


#### Examples:

Matching city centerlines to SharedStreets:
```sh
$ shst match ~/Desktop/project/city_centerlines.geojson --out=city_centerlines.geojson
```

Matching city bike facilities to SharedStreets:
```sh
$ shst match ~/Desktop/project/city_bikeways.geojson --out=city_bikeways.geojson --match-bike --tile-hierarchy=8
```

## Development

For developers:

### Install
```sh
git clone https://github.com/sharedstreets/sharedstreets-js.git
yarn install
yarn prepack
yarn global add /Users/username/github/sharedstreets-js
```

### Test

You can test your installation using the following:
```sh
yarn test
```
### Troubleshooting

- When updating `sharedstreets-js`, remove the cache of graphs and data that were created using previous versions. Do this by deleting the entire `sharedstreets-js/shst` directory.


### Build docs

```sh
yarn run docs
```

### Benchmark

```sh
yarn run bench
```
