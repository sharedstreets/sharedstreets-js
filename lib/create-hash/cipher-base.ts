import { Transform } from 'stream'
import { StringDecoder } from 'string_decoder'

export default class CipherBase extends Transform {
  public hashMode: boolean
  public final: any
  public __final: any
  public _decoder: any
  public _encoding: any
  [key: string]: any

  constructor (hashMode: string) {
    super()
    this.hashMode = typeof hashMode === 'string'
    if (this.hashMode) {
      this[hashMode] = this._finalOrDigest
    } else {
      this.final = this._finalOrDigest
    }
    if (this._final) {
      this.__final = this._final
      this._final = null
    }
    this._decoder = null
    this._encoding = null
  }
  public update (data: any, inputEnc?: any, outputEnc?: any) {
    if (typeof data === 'string') {
      data = Buffer.from(data, inputEnc)
    }

    let outData = this._update(data)
    if (this.hashMode) return this

    if (outputEnc) {
      outData = this._toString(outData, outputEnc)
    }

    return outData
  }

  public setAutoPadding () {}
  public getAuthTag () {
    throw new Error('trying to get auth tag in unsupported state')
  }

  public setAuthTag () {
    throw new Error('trying to set auth tag in unsupported state')
  }

  public setAAD () {
    throw new Error('trying to set aad in unsupported state')
  }

  public _transform (data: any, _: any, next: any) {
    let err
    try {
      if (this.hashMode) {
        this._update(data)
      } else {
        this.push(this._update(data))
      }
    } catch (e) {
      err = e
    } finally {
      next(err)
    }
  }
  public _flush (done: any) {
    let err
    try {
      this.push(this.__final())
    } catch (e) {
      err = e
    }

    done(err)
  }
  public _finalOrDigest (outputEnc: any) {
    let outData = this.__final() || Buffer.alloc(0)
    if (outputEnc) {
      outData = this._toString(outData, outputEnc, true)
    }
    return outData
  }

  public _toString (value: any, enc: any, fin?: any) {
    if (!this._decoder) {
      this._decoder = new StringDecoder(enc)
      this._encoding = enc
    }

    if (this._encoding !== enc) throw new Error('can\'t switch encodings')

    let out = this._decoder.write(value)
    if (fin) {
      out += this._decoder.end()
    }

    return out
  }
}
