import { Transform, TransformCallback } from 'stream'
import { parseEnvelope } from '@cucumber/messages'

/**
 * Transforms an NDJSON stream to a stream of message objects
 */
export default class NdjsonToMessageStream extends Transform {
  private buffer: string

  constructor() {
    super({ writableObjectMode: false, readableObjectMode: true })
  }

  public _transform(chunk: string, encoding: string, callback: TransformCallback): void {
    if (this.buffer === undefined) {
      this.buffer = ''
    }
    this.buffer += Buffer.isBuffer(chunk) ? chunk.toString('utf-8') : chunk
    const lines = this.buffer.split('\n')
    this.buffer = lines.pop()
    for (const line of lines) {
      if (line.trim().length > 0) {
        try {
          const envelope = parseEnvelope(line)
          this.push(envelope)
        } catch (err) {
          err.message =
            err.message +
            `
Not JSON: '${line}'
`
          return callback(err)
        }
      }
    }
    callback()
  }

  public _flush(callback: TransformCallback): void {
    if (this.buffer) {
      try {
        const object = JSON.parse(this.buffer)
        this.push(object)
      } catch (err) {
        return callback(new Error(`Not JSONs: ${this.buffer}`))
      }
    }
    callback()
  }
}
