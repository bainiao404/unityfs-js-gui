/**
 * Binary reader for little-endian data using DataView
 */
export class BinaryReader {
    constructor(ArrayBuffer) {
        this.buffer = ArrayBuffer
        this.view = new DataView(ArrayBuffer)
        this.offset = 0
    }

    seek(pos, whence = 0) {
        if (whence === 0) this.offset = pos
        else if (whence === 1) this.offset += pos
        else if (whence === 2) this.offset = this.buffer.byteLength + pos
    }

    tell() {
        return this.offset
    }

    readByte() {
        const v = this.view.getUint8(this.offset)
        this.offset += 1
        return v
    }

    readBytes(count) {
        const v = this.buffer.slice(this.offset, this.offset + count)
        this.offset += count
        return v
    }

    readInt16() {
        const v = this.view.getInt16(this.offset, true)
        this.offset += 2
        return v
    }

    readUint16() {
        const v = this.view.getUint16(this.offset, true)
        this.offset += 2
        return v
    }

    readInt32() {
        const v = this.view.getInt32(this.offset, true)
        this.offset += 4
        return v
    }

    readUint32() {
        const v = this.view.getUint32(this.offset, true)
        this.offset += 4
        return v
    }

    readInt64() {
        const v = Number(this.view.getBigInt64(this.offset, true))
        this.offset += 8
        return v
    }

    readUint64() {
        const v = Number(this.view.getBigUint64(this.offset, true))
        this.offset += 8
        return v
    }

    readBoolean() {
        const v = this.view.getUint8(this.offset) !== 0
        this.offset += 1
        return v
    }

    readChar() {
        const v = String.fromCharCode(this.view.getUint8(this.offset))
        this.offset += 1
        return v
    }

    read4Uint32() {
        const v = [
            this.view.getUint32(this.offset, true),
            this.view.getUint32(this.offset + 4, true),
            this.view.getUint32(this.offset + 8, true),
            this.view.getUint32(this.offset + 12, true),
        ]
        this.offset += 16
        return v
    }

    readFormat(fmt) {
        const results = []
        const matches = fmt.match(/<([^>]+)>/)
        const types = matches ? matches[1] : fmt
        for (const t of types) {
            if (t === 'i' || t === 'I') {
                results.push(t === 'i' ? this.readInt32() : this.readUint32())
            }
        }
        return results
    }
}
