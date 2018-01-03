/* istanbul ignore file */

import * as ieee754 from './ieee754'

export type ReadField<Data = any> = (tag: number, data: Data, pbf: Pbf) => Data
export type PbfBuffer = Buffer | Uint8Array

const SHIFT_LEFT_32 = (1 << 16) * (1 << 16)
const SHIFT_RIGHT_32 = 1 / SHIFT_LEFT_32

export default class Pbf {
  public static Varint = 0 // varint: int32, int64, uint32, uint64, sint32, sint64, bool, enum
  public static Fixed64 = 1 // 64-bit: double, fixed64, sfixed64
  public static Bytes = 2 // length-delimited: string, bytes, embedded messages, packed repeated fields
  public static Fixed32 = 5 // 32-bit: float, fixed32, sfixed32

  public buf: PbfBuffer
  public pos: number
  public type: number
  public length: number

  constructor(buf: PbfBuffer) {
    this.buf = buf
    // this.buf = ArrayBuffer.isView && ArrayBuffer.isView(buf) ? buf : new Uint8Array(buf || 0)
    this.pos = 0
    this.type = 0
    this.length = this.buf.length
  }

  public destroy() {
    this.buf = null
  }

  // === READING =================================================================

  public readFields<Data = any>(readField: ReadField<Data>, result?: Data, end?: number) {
    end = end || this.length

    while (this.pos < end) {
      const val = this.readVarint()
      const tag = val >> 3
      const startPos = this.pos

      this.type = val & 0x7
      readField(tag, result, this)

      // if (this.pos === startPos) this.skip(val)
    }
    return result
  }

  public readMessage<Data = any>(readField: ReadField<Data>, result?: Data) {
    return this.readFields(readField, result, this.readVarint() + this.pos)
  }

  public readFixed32() {
    const val = readUInt32(this.buf, this.pos)
    this.pos += 4
    return val
  }

  public readSFixed32() {
    const val = readInt32(this.buf, this.pos)
    this.pos += 4
    return val
  }

    // 64-bit int handling is based on github.com/dpw/node-buffer-more-ints (MIT-licensed)

  public readFixed64() {
    const val = readUInt32(this.buf, this.pos) + readUInt32(this.buf, this.pos + 4) * SHIFT_LEFT_32
    this.pos += 8
    return val
  }

  public readSFixed64() {
    const val = readUInt32(this.buf, this.pos) + readInt32(this.buf, this.pos + 4) * SHIFT_LEFT_32
    this.pos += 8
    return val
  }

  public readFloat() {
    const val = ieee754.read(this.buf, this.pos, true, 23, 4)
    this.pos += 4
    return val
  }

  public readDouble() {
    const val = ieee754.read(this.buf, this.pos, true, 52, 8)
    this.pos += 8
    return val
  }

  public readVarint(isSigned?: boolean) {
    const buf = this.buf
    let val
    let b

    b = buf[this.pos++]; val = b & 0x7f; if (b < 0x80) return val
    b = buf[this.pos++]; val |= (b & 0x7f) << 7; if (b < 0x80) return val
    b = buf[this.pos++]; val |= (b & 0x7f) << 14; if (b < 0x80) return val
    b = buf[this.pos++]; val |= (b & 0x7f) << 21; if (b < 0x80) return val
    b = buf[this.pos]; val |= (b & 0x0f) << 28

    return readVarintRemainder(val, isSigned, this)
  }

  public readVarint64() { // for compatibility with v2.0.1
    return this.readVarint(true)
  }

  public readSVarint() {
    const num = this.readVarint()
    return num % 2 === 1 ? (num + 1) / -2 : num / 2 // zigzag encoding
  }

  public readBoolean() {
    return Boolean(this.readVarint())
  }

  public readString() {
    const end = this.readVarint() + this.pos
    const str = readUtf8(this.buf, this.pos, end)
    this.pos = end
    return str
  }

  public readBytes() {
    const end = this.readVarint() + this.pos
    const buffer = this.buf.subarray(this.pos, end)
    this.pos = end
    return buffer
  }

  // verbose for performance reasons; doesn't affect gzipped size
  public readPackedVarint(arr?: number[], isSigned?: boolean) {
    const end = readPackedEnd(this)
    arr = arr || []
    while (this.pos < end) arr.push(this.readVarint(isSigned))
    return arr
  }
  public readPackedSVarint(arr?: number[]) {
    const end = readPackedEnd(this)
    arr = arr || []
    while (this.pos < end) arr.push(this.readSVarint())
    return arr
  }
  public readPackedBoolean(arr?: boolean[]) {
    const end = readPackedEnd(this)
    arr = arr || []
    while (this.pos < end) arr.push(this.readBoolean())
    return arr
  }
  public readPackedFloat(arr?: number[]) {
    const end = readPackedEnd(this)
    arr = arr || []
    while (this.pos < end) arr.push(this.readFloat())
    return arr
  }
  public readPackedDouble(arr?: number[]) {
    const end = readPackedEnd(this)
    arr = arr || []
    while (this.pos < end) arr.push(this.readDouble())
    return arr
  }
  public readPackedFixed32(arr?: number[]) {
    const end = readPackedEnd(this)
    arr = arr || []
    while (this.pos < end) arr.push(this.readFixed32())
    return arr
  }
  public readPackedSFixed32(arr?: number[]) {
    const end = readPackedEnd(this)
    arr = arr || []
    while (this.pos < end) arr.push(this.readSFixed32())
    return arr
  }
  public readPackedFixed64(arr?: number[]) {
    const end = readPackedEnd(this)
    arr = arr || []
    while (this.pos < end) arr.push(this.readFixed64())
    return arr
  }
  public readPackedSFixed64(arr?: number[]) {
    const end = readPackedEnd(this)
    arr = arr || []
    while (this.pos < end) arr.push(this.readSFixed64())
    return arr
  }

  public skip(val: any) {
    const type = val & 0x7

    if (type === Pbf.Varint) while (this.buf[this.pos++] > 0x7f) {}
    else if (type === Pbf.Bytes) this.pos = this.readVarint() + this.pos
    else if (type === Pbf.Fixed32) this.pos += 4
    else if (type === Pbf.Fixed64) this.pos += 8
    else throw new Error('Unimplemented type: ' + type)
  }

  // === WRITING =================================================================

  public writeTag(tag: number, type: number) {
    this.writeVarint((tag << 3) | type)
  }

  public realloc(min: number) {
    let length = this.length || 16

    while (length < this.pos + min) length *= 2

    if (length !== this.length) {
      const buf = new Uint8Array(length)
      buf.set(this.buf)
      this.buf = buf
      this.length = length
    }
  }

  public finish() {
    this.length = this.pos
    this.pos = 0
    return this.buf.subarray(0, this.length)
  }

  public writeFixed32(val: number) {
    this.realloc(4)
    writeInt32(this.buf, val, this.pos)
    this.pos += 4
  }

  public writeSFixed32(val: number) {
    this.realloc(4)
    writeInt32(this.buf, val, this.pos)
    this.pos += 4
  }

  public writeFixed64(val: number) {
    this.realloc(8)
    writeInt32(this.buf, val & -1, this.pos)
    writeInt32(this.buf, Math.floor(val * SHIFT_RIGHT_32), this.pos + 4)
    this.pos += 8
  }

  public writeSFixed64(val: number) {
    this.realloc(8)
    writeInt32(this.buf, val & -1, this.pos)
    writeInt32(this.buf, Math.floor(val * SHIFT_RIGHT_32), this.pos + 4)
    this.pos += 8
  }

  public writeVarint(val: any) {
    val = +val || 0

    if (val > 0xfffffff || val < 0) {
      writeBigVarint(val, this)
      return
    }

    this.realloc(4)

    this.buf[this.pos++] = val & 0x7f | (val > 0x7f ? 0x80 : 0); if (val <= 0x7f) return
    this.buf[this.pos++] = ((val >>>= 7) & 0x7f) | (val > 0x7f ? 0x80 : 0); if (val <= 0x7f) return
    this.buf[this.pos++] = ((val >>>= 7) & 0x7f) | (val > 0x7f ? 0x80 : 0); if (val <= 0x7f) return
    this.buf[this.pos++] = (val >>> 7) & 0x7f
  }

  public writeSVarint(val: number) {
    this.writeVarint(val < 0 ? -val * 2 - 1 : val * 2)
  }

  public writeBoolean(val: any) {
    this.writeVarint(Boolean(val))
  }

  public writeString(str: string) {
    str = String(str)
    this.realloc(str.length * 4)

    this.pos++ // reserve 1 byte for short string length

    const startPos = this.pos
        // write the string directly to the buffer and see how much was written
    this.pos = writeUtf8(this.buf, str, this.pos)
    const len = this.pos - startPos

    if (len >= 0x80) makeRoomForExtraLength(startPos, len, this)

        // finally, write the message length in the reserved place and restore the position
    this.pos = startPos - 1
    this.writeVarint(len)
    this.pos += len
  }

  public writeFloat(val: number) {
    this.realloc(4)
    ieee754.write(this.buf, val, this.pos, true, 23, 4)
    this.pos += 4
  }

  public writeDouble(val: number) {
    this.realloc(8)
    ieee754.write(this.buf, val, this.pos, true, 52, 8)
    this.pos += 8
  }

  public writeBytes(buffer: PbfBuffer) {
    const len = buffer.length
    this.writeVarint(len)
    this.realloc(len)
    for (let i = 0; i < len; i++) this.buf[this.pos++] = buffer[i]
  }

  public writeRawMessage(fn: any, obj: any) {
    this.pos++ // reserve 1 byte for short message length

    // write the message directly to the buffer and see how much was written
    const startPos = this.pos
    fn(obj, this)
    const len = this.pos - startPos

    if (len >= 0x80) makeRoomForExtraLength(startPos, len, this)

        // finally, write the message length in the reserved place and restore the position
    this.pos = startPos - 1
    this.writeVarint(len)
    this.pos += len
  }

  public writeMessage(tag: number, fn: any, obj: any) {
    this.writeTag(tag, Pbf.Bytes)
    this.writeRawMessage(fn, obj)
  }

  public writePackedVarint(tag: number, arr?: number[]) { this.writeMessage(tag, writePackedVarint, arr) }
  public writePackedSVarint(tag: number, arr?: number[]) { this.writeMessage(tag, writePackedSVarint, arr) }
  public writePackedBoolean(tag: number, arr?: number[]) { this.writeMessage(tag, writePackedBoolean, arr) }
  public writePackedFloat(tag: number, arr?: number[]) { this.writeMessage(tag, writePackedFloat, arr) }
  public writePackedDouble(tag: number, arr?: number[]) { this.writeMessage(tag, writePackedDouble, arr) }
  public writePackedFixed32(tag: number, arr?: number[]) { this.writeMessage(tag, writePackedFixed32, arr) }
  public writePackedSFixed32(tag: number, arr?: number[]) { this.writeMessage(tag, writePackedSFixed32, arr) }
  public writePackedFixed64(tag: number, arr?: number[]) { this.writeMessage(tag, writePackedFixed64, arr) }
  public writePackedSFixed64(tag: number, arr?: number[]) { this.writeMessage(tag, writePackedSFixed64, arr) }

  public writeBytesField(tag: number, buffer: PbfBuffer) {
    this.writeTag(tag, Pbf.Bytes)
    this.writeBytes(buffer)
  }
  public writeFixed32Field(tag: number, val: number) {
    this.writeTag(tag, Pbf.Fixed32)
    this.writeFixed32(val)
  }
  public writeSFixed32Field(tag: number, val: number) {
    this.writeTag(tag, Pbf.Fixed32)
    this.writeSFixed32(val)
  }
  public writeFixed64Field(tag: number, val: number) {
    this.writeTag(tag, Pbf.Fixed64)
    this.writeFixed64(val)
  }
  public writeSFixed64Field(tag: number, val: number) {
    this.writeTag(tag, Pbf.Fixed64)
    this.writeSFixed64(val)
  }
  public writeVarintField(tag: number, val: any) {
    this.writeTag(tag, Pbf.Varint)
    this.writeVarint(val)
  }
  public writeSVarintField(tag: number, val: number) {
    this.writeTag(tag, Pbf.Varint)
    this.writeSVarint(val)
  }
  public writeStringField(tag: number, str: string) {
    this.writeTag(tag, Pbf.Bytes)
    this.writeString(str)
  }
  public writeFloatField(tag: number, val: number) {
    this.writeTag(tag, Pbf.Fixed32)
    this.writeFloat(val)
  }
  public writeDoubleField(tag: number, val: number) {
    this.writeTag(tag, Pbf.Fixed64)
    this.writeDouble(val)
  }
  public writeBooleanField(tag: number, val: any) {
    this.writeVarintField(tag, Boolean(val))
  }
}

function readVarintRemainder(l: number, s: boolean, p: Pbf) {
  const buf = p.buf
  let h
  let b

  b = buf[p.pos++]; h = (b & 0x70) >> 4; if (b < 0x80) return toNum(l, h, s)
  b = buf[p.pos++]; h |= (b & 0x7f) << 3; if (b < 0x80) return toNum(l, h, s)
  b = buf[p.pos++]; h |= (b & 0x7f) << 10; if (b < 0x80) return toNum(l, h, s)
  b = buf[p.pos++]; h |= (b & 0x7f) << 17; if (b < 0x80) return toNum(l, h, s)
  b = buf[p.pos++]; h |= (b & 0x7f) << 24; if (b < 0x80) return toNum(l, h, s)
  b = buf[p.pos++]; h |= (b & 0x01) << 31; if (b < 0x80) return toNum(l, h, s)

  throw new Error('Expected varint not more than 10 bytes')
}

function readPackedEnd(pbf: Pbf) {
  return pbf.type === Pbf.Bytes
        ? pbf.readVarint() + pbf.pos : pbf.pos + 1
}

function toNum(low: number, high: number, isSigned?: boolean) {
  if (isSigned) {
    return high * 0x100000000 + (low >>> 0)
  }

  return ((high >>> 0) * 0x100000000) + (low >>> 0)
}

function writeBigVarint(val: number, pbf: Pbf) {
  let low
  let high

  if (val >= 0) {
    low = (val % 0x100000000) | 0
    high = (val / 0x100000000) | 0
  } else {
    low = ~(-val % 0x100000000)
    high = ~(-val / 0x100000000)

    if (low ^ 0xffffffff) {
      low = (low + 1) | 0
    } else {
      low = 0
      high = (high + 1) | 0
    }
  }

  if (val >= 0x10000000000000000 || val < -0x10000000000000000) {
    throw new Error('Given varint doesn\'t fit into 10 bytes')
  }

  pbf.realloc(10)

  writeBigVarintLow(low, high, pbf)
  writeBigVarintHigh(high, pbf)
}

function writeBigVarintLow(low: number, high: number, pbf: Pbf) {
  pbf.buf[pbf.pos++] = low & 0x7f | 0x80; low >>>= 7
  pbf.buf[pbf.pos++] = low & 0x7f | 0x80; low >>>= 7
  pbf.buf[pbf.pos++] = low & 0x7f | 0x80; low >>>= 7
  pbf.buf[pbf.pos++] = low & 0x7f | 0x80; low >>>= 7
  pbf.buf[pbf.pos] = low & 0x7f
}

function writeBigVarintHigh(high: number, pbf: Pbf) {
  const lsb = (high & 0x07) << 4

  pbf.buf[pbf.pos++] |= lsb | ((high >>>= 3) ? 0x80 : 0); if (!high) return
  pbf.buf[pbf.pos++] = high & 0x7f | ((high >>>= 7) ? 0x80 : 0); if (!high) return
  pbf.buf[pbf.pos++] = high & 0x7f | ((high >>>= 7) ? 0x80 : 0); if (!high) return
  pbf.buf[pbf.pos++] = high & 0x7f | ((high >>>= 7) ? 0x80 : 0); if (!high) return
  pbf.buf[pbf.pos++] = high & 0x7f | ((high >>>= 7) ? 0x80 : 0); if (!high) return
  pbf.buf[pbf.pos++] = high & 0x7f
}

function makeRoomForExtraLength (startPos: number, len: number, pbf: Pbf) {
  const extraLen =
        len <= 0x3fff ? 1
        : len <= 0x1fffff ? 2
        : len <= 0xfffffff ? 3 : Math.ceil(Math.log(len) / (Math.LN2 * 7))

    // if 1 byte isn't enough for encoding message length, shift the data to the right
  pbf.realloc(extraLen)
  for (let i = pbf.pos - 1; i >= startPos; i--) pbf.buf[i + extraLen] = pbf.buf[i]
}

function writePackedVarint (arr: number[], pbf: Pbf) { for (const val of arr) pbf.writeVarint(val) }
function writePackedSVarint (arr: number[], pbf: Pbf) { for (const val of arr) pbf.writeSVarint(val) }
function writePackedFloat (arr: number[], pbf: Pbf) { for (const val of arr) pbf.writeFloat(val) }
function writePackedDouble (arr: number[], pbf: Pbf) { for (const val of arr) pbf.writeDouble(val) }
function writePackedBoolean (arr: number[], pbf: Pbf) { for (const val of arr) pbf.writeBoolean(val) }
function writePackedFixed32 (arr: number[], pbf: Pbf) { for (const val of arr) pbf.writeFixed32(val) }
function writePackedSFixed32 (arr: number[], pbf: Pbf) { for (const val of arr) pbf.writeSFixed32(val) }
function writePackedFixed64 (arr: number[], pbf: Pbf) { for (const val of arr) pbf.writeFixed64(val) }
function writePackedSFixed64 (arr: number[], pbf: Pbf) { for (const val of arr) pbf.writeSFixed64(val) }

// Buffer code below from https://github.com/feross/buffer, MIT-licensed

function readUInt32 (buf: PbfBuffer, pos: number) {
  return ((buf[pos]) |
        (buf[pos + 1] << 8) |
        (buf[pos + 2] << 16)) +
        (buf[pos + 3] * 0x1000000)
}

function writeInt32 (buf: PbfBuffer, val: number, pos: number) {
  buf[pos] = val
  buf[pos + 1] = (val >>> 8)
  buf[pos + 2] = (val >>> 16)
  buf[pos + 3] = (val >>> 24)
}

function readInt32 (buf: PbfBuffer, pos: number) {
  return ((buf[pos]) |
        (buf[pos + 1] << 8) |
        (buf[pos + 2] << 16)) +
        (buf[pos + 3] << 24)
}

function readUtf8 (buf: PbfBuffer, pos: number, end: number) {
  let str = ''
  let i = pos

  while (i < end) {
    const b0 = buf[i]
    let c = null // codepoint
    let bytesPerSequence =
            b0 > 0xEF ? 4
            : b0 > 0xDF ? 3
            : b0 > 0xBF ? 2 : 1

    if (i + bytesPerSequence > end) break

    let b1
    let b2
    let b3

    if (bytesPerSequence === 1) {
      if (b0 < 0x80) {
        c = b0
      }
    } else if (bytesPerSequence === 2) {
      b1 = buf[i + 1]
      if ((b1 & 0xC0) === 0x80) {
        c = (b0 & 0x1F) << 0x6 | (b1 & 0x3F)
        if (c <= 0x7F) {
          c = null
        }
      }
    } else if (bytesPerSequence === 3) {
      b1 = buf[i + 1]
      b2 = buf[i + 2]
      if ((b1 & 0xC0) === 0x80 && (b2 & 0xC0) === 0x80) {
        c = (b0 & 0xF) << 0xC | (b1 & 0x3F) << 0x6 | (b2 & 0x3F)
        if (c <= 0x7FF || (c >= 0xD800 && c <= 0xDFFF)) {
          c = null
        }
      }
    } else if (bytesPerSequence === 4) {
      b1 = buf[i + 1]
      b2 = buf[i + 2]
      b3 = buf[i + 3]
      if ((b1 & 0xC0) === 0x80 && (b2 & 0xC0) === 0x80 && (b3 & 0xC0) === 0x80) {
        c = (b0 & 0xF) << 0x12 | (b1 & 0x3F) << 0xC | (b2 & 0x3F) << 0x6 | (b3 & 0x3F)
        if (c <= 0xFFFF || c >= 0x110000) {
          c = null
        }
      }
    }

    if (c === null) {
      c = 0xFFFD
      bytesPerSequence = 1
    } else if (c > 0xFFFF) {
      c -= 0x10000
      str += String.fromCharCode(c >>> 10 & 0x3FF | 0xD800)
      c = 0xDC00 | c & 0x3FF
    }

    str += String.fromCharCode(c)
    i += bytesPerSequence
  }

  return str
}

function writeUtf8 (buf: PbfBuffer, str: string, pos: number) {
  for (let i = 0, c, lead; i < str.length; i++) {
    c = str.charCodeAt(i) // code point

    if (c > 0xD7FF && c < 0xE000) {
      if (lead) {
        if (c < 0xDC00) {
          buf[pos++] = 0xEF
          buf[pos++] = 0xBF
          buf[pos++] = 0xBD
          lead = c
          continue
        } else {
          c = lead - 0xD800 << 10 | c - 0xDC00 | 0x10000
          lead = null
        }
      } else {
        if (c > 0xDBFF || (i + 1 === str.length)) {
          buf[pos++] = 0xEF
          buf[pos++] = 0xBF
          buf[pos++] = 0xBD
        } else {
          lead = c
        }
        continue
      }
    } else if (lead) {
      buf[pos++] = 0xEF
      buf[pos++] = 0xBF
      buf[pos++] = 0xBD
      lead = null
    }

    if (c < 0x80) {
      buf[pos++] = c
    } else {
      if (c < 0x800) {
        buf[pos++] = c >> 0x6 | 0xC0
      } else {
        if (c < 0x10000) {
          buf[pos++] = c >> 0xC | 0xE0
        } else {
          buf[pos++] = c >> 0x12 | 0xF0
          buf[pos++] = c >> 0xC & 0x3F | 0x80
        }
        buf[pos++] = c >> 0x6 & 0x3F | 0x80
      }
      buf[pos++] = c & 0x3F | 0x80
    }
  }
  return pos
}
