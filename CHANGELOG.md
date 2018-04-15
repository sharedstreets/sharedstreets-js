# Changelog

## 2018-02-21 - 0.9.1

- Revert `nodeId` to `number` type.
- Convert `bench.js` to Typescript

## 2018-02-20 - 0.9.0

- `distanceToNextRef` has been changed to calculate distance along geometry instead of `start` to `end` points.

## 2018-02-19 - 0.8.2

- Fix closed loops LineStrings: https://github.com/sharedstreets/sharedstreets-conflator/issues/8

## 2018-02-18 - 0.8.0

- Implement `backReference` & `forwardReference` methods.
- Implement `getStartCoord` & `getEndCoord` methods, easy way to extract coordinates from a GeoJSON LineString.
- Implement `getFormOfWay` method, easy way to extract FormOfWay from a GeoJSON LineString.
- Update `distanceToNextRef` to use `start` & `end` params.

## 2018-02-17

- Add new helper methods `inboundBearing`, `outboundBearing` & `distanceToNextRef`.

## 2018-02-16 - 0.7.2

- Enforce strict TSLint/Typescript configs

## 2018-02-15 - 0.7.0

- Add new method `metadata`
- Update docs for `reference`
- Add new method `reference`

## 2018-02-12

- Add new method `intersection`

## 2018-02-11

- Add new method `geometry`
- Convert tests to Typescript

## 2018-02-08 - 0.6.0

- Make `formOfWay` optional for `referenceId` method.
- Add `coordsToLonlats` method

## 2018-02-06 - 0.5.0

- Enforce strict TSLint `tslint.json`
- Enforce strict=true `tsconfig.json`
  https://github.com/sharedstreets/sharedstreets-js/issues/9

## 2018-01-30 - 0.4.0

- Improved readability of testing (expectedId)
- Handle FormOfWay as `undefined`
- Split method names `getFormOfWay` => `getFormOfWayString` & `getFormOfWayNumber`
- Split method names `getFormOfWay` => `getFormOfWayString` & `getFormOfWayNumber`
- Update pbf sample data

## 2018-01-29 - 0.3.0

- Fix `bignumber.js` precision loss issue
- Add `.pbf` test cases (intersection 100%, geometry 100%, reference 0%)
- Replace `latlonsToCoords` => `lonlatsToCoords`

## 2018-01-27 - 0.2.0

- Add messages methods (helps troubleshoot library)
- Add `geometryMessage`
- Add `intersectionMessage`
- Add `referenceMessage`

## 2018-01-25

- Add `referenceId`
- Add `locationReference`
- Clean documentation

## 2018-01-23

- Add `geometryId`
- Add `intersectionId`

## 2018-01-11

- Start implementation of SharedStreets Location Reference
- Start implementation of SharedStreets Reference

## 2018-01-10

- Drop Rollup bundler in favor of Browserify (Config too complex when including Crypto & Typescript)
- Replaced Base58 with Base16 (hex)

## 2018-01-09

- Implement `sharedstreets.geometry`

## 2018-01-05

- Drop PBF & Typescript definition from core library

## 2018-01-03

- Implement Geometry Pbf parser

## 2018-01-02

- Implement Intersection Pbf parser

## 2018-01-01

- Setup boilerplate
- Add PBF test fixtures
- Add initial JSDocs documentation
