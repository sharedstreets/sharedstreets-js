// base-x encoding
// Forked from https://github.com/cryptocoinjs/bs58
// Originally written by Mike Hearn for BitcoinJ
// Copyright (c) 2011 Google Inc
// Ported to JavaScript by Stefan Thomas
// Merged Buffer refactorings from base58-native by Stephen Pair
// Copyright (c) 2013 BitPay Inc
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const ALPHABET_MAP: any = {}
const BASE = ALPHABET.length
const LEADER = ALPHABET.charAt(0)

// pre-compute lookup table
for (let z = 0; z < ALPHABET.length; z++) {
  const x = ALPHABET.charAt(z)

  if (ALPHABET_MAP[x] !== undefined) throw new TypeError(x + ' is ambiguous')
  ALPHABET_MAP[x] = z
}

export function encode (source: any) {
  if (source.length === 0) return ''

  const digits = [0]
  for (const char of source) {
    let carry = char
    for (let j = 0; j < digits.length; ++j) {
      carry += digits[j] << 8
      digits[j] = carry % BASE
      carry = (carry / BASE) | 0
    }

    while (carry > 0) {
      digits.push(carry % BASE)
      carry = (carry / BASE) | 0
    }
  }

  let str = ''

  // deal with leading zeros
  for (let k = 0; source[k] === 0 && k < source.length - 1; ++k) str += LEADER
  // convert digits to a string
  for (let q = digits.length - 1; q >= 0; --q) str += ALPHABET[digits[q]]

  return str
}
