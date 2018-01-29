# Changelog

## 2018-01-29 - 0.3.0

- Fix `bignumber.js` precision loss issue
- Add `.pbf` test cases
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
