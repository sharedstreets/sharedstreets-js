# SharedStreets (Node.js & JavaScript): Data Tools Branch

[![npm version](https://badge.fury.io/js/sharedstreets.svg)](https://badge.fury.io/js/sharedstreets)
[![CircleCI](https://circleci.com/gh/sharedstreets/sharedstreets-js.svg?style=svg)](https://circleci.com/gh/sharedstreets/sharedstreets-js)

Node.js & JavaScript implementation of [SharedStreets Reference System](https://github.com/sharedstreets/sharedstreets-ref-system).

## Branch overview

This branch was set up to facilitate aggregation and merging of event data for the SharedStreets TNC pick-up and drop-off data pilot. You can read more about that [here](https://medium.com/sharedstreets/tnc-and-taxi-data-methodology-9c9b31d873bf) and [here](https://medium.com/sharedstreets/expanding-our-pick-up-drop-off-data-program-ccb0b1384abe).

![](https://miro.medium.com/max/1100/1*6hJM6q-4axA0QWWhlZ84DA.png)

We've made this branch public in case others would like to take a similar approach to working with their own event data. Instructions for installing and using the tools are in following sections.

The way we generate the PUDO visualizations works like this:

### Step 1: Lyft and Uber run data aggregations internally

Matching to the correct side of the street: Uber and Lyft both run the SharedStreets Matcher software on their respective systems. The matcher takes the company's GPS trace data and converts it to data points that are linked to a SharedStreets Reference ID. The matcher uses the GPS breadcrumb data (trip trail) to determine which side of the street the vehicle was moving on before the trip ended (drop-off) or after it started (pick-up) and snaps the endpoint of that trip to the appropriate side of the street. The point is then classified  as a pick-up or drop-off event.

Binning: Each datapoint now includes a SharedStreets Reference ID (which links it to a precise point along the street), and an indication of whether it is a pick-up or drop-off. The software uses the length of the street to create bins as close to 10 meters each as possible. For example, if the street is 97 meters long, there would be 10 bins that are 9.7 meters long. Each bin is assigned a number.

Data Packaging: The output of the SharedStreets Matcher software is processed data that is shipped over to SharedStreets as a large spreadsheet that contains the following:
- The SharedStreets Reference ID
- Hour of day
- The bin number
- The number of pick-ups per bin
- The number of drop-offs per bin

### Step 2: SharedStreets merges datasets together

The data that is generated through the SharedStreets Matcher software as part of Step 1 is hosted by each company as a zipped and encrypted file. SharedStreets downloads the individual files from each company and merges the data together. The individual provider data is not retained immediately after the data is merged together.

SharedStreets takes the raw volumes of pick-ups and drop-offs and uses these to create a metric we call the “curb productivity” or the "period average count". This is the number of trips in the bin, divided by the bin length in meters, divided by the number of hours in the time period being queried. This equates to number of trips per hour, per meter. While this may seem cumbersome at first, it's a way to normalize the data so that direct comparisons can be made between streets or between time periods. This aggregated metric is what’s displayed going forward.  

To protect individuals' privacy, data is only aggregated if the bins contain more than 10 observations for the given time range. This is intended to prevent reidentification of individuals. If a bin has fewer than 10 observations, it is not shown in the platform or included in the data.

### Step 3: Visualizing street-linked data

SharedStreets takes the combined dataset and links the information provided to the appropriate street segments based on the SharedStreets Reference IDs provided. We use this data to create an area-specific deployment of our aggregate data viewing tool (the code for that lives in this branch). The viewing tool is a platform that SharedStreets hosts for the datasharing pilot. It allows government staff to view, query, and interact with the pick-up and drop-off data. It also enables staff to export the data in case they want to run further analysis or combine it with their own GIS datasets to better understand how streets are being used.

The viewing platform is password-protected. A user’s log-in (government email address) is affiliated with a geographic area. When a user selects an area, the data model produces graduated symbol dot visualizations to show the rate of curbside activity based on the area selected.

## Install

### In Node.js

#### npm

```sh
npm install sharedstreets
```

#### yarn

```sh
yarn add sharedstreets
```

## Usage

### CommonJS

```js
const sharedstreets = require('sharedstreets');
```

### Typescript

```js
import * as sharedstreets from 'sharedstreets';
```

### In Browser

For a full list of web examples, check out [SharedStreets examples](https://github.com/sharedstreets/sharedstreets-examples).

## Development

### Install

```sh
yarn install
```

### Test

```sh
yarn test
```

### Build docs

```sh
yarn run docs
```

### Benchmark

```sh
yarn run bench
```

## API

<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

### Table of Contents
