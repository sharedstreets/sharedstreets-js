
import md5 from './md5'
import Base from './cipher-base'

class HashNoConstructor extends Base {
  constructor (hash: any) {
    super('digest')
    this._hash = hash
    this.buffers = []
  }
  public _update (data: any) {
    this.buffers.push(data)
  }

  public _final () {
    const buf = Buffer.concat(this.buffers)
    const r = this._hash(buf)
    this.buffers = null

    return r
  }
}

export default function createHash (alg: string) {
  if (alg === 'md5') return new HashNoConstructor(md5)
}
