/**
 * Hash128 - can be constructed from string or 4 uint32 values
 */
export class Hash128 {
    constructor(...values) {
        this.Value =
            values.length === 1
                ? values[0]
                : ((v) => {
                      const buf = new ArrayBuffer(16)
                      const view = new DataView(buf)
                      view.setUint32(0, v[0], true)
                      view.setUint32(4, v[1], true)
                      view.setUint32(8, v[2], true)
                      view.setUint32(12, v[3], true)
                      return Array.from(new Uint8Array(buf))
                          .map((b) => b.toString(16).padStart(2, '0'))
                          .join('')
                  })(values)
    }

    equals(value) {
        return value && this.Value === value.Value
    }

    toString() {
        return `Hash128(Value=${this.Value})`
    }
}
