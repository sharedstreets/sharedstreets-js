const intSize = 4
const zeroBuffer = new Buffer(intSize)
zeroBuffer.fill(0)

const charSize = 8
const hashSize = 16

function toArray (buf: Buffer) {
  if ((buf.length % intSize) !== 0) {
    const len = buf.length + (intSize - (buf.length % intSize))
    buf = Buffer.concat([buf, zeroBuffer], len)
  }

  const arr = new Array(buf.length >>> 2)
  for (let i = 0, j = 0; i < buf.length; i += intSize, j++) {
    arr[j] = buf.readInt32LE(i)
  }

  return arr
}

export default function hash (buf: Buffer, fn: any) {
  const arr = fn(toArray(buf), buf.length * charSize)
  buf = new Buffer(hashSize)
  for (let i = 0; i < arr.length; i++) {
    buf.writeInt32LE(arr[i], i << 2, true)
  }
  return buf
}
