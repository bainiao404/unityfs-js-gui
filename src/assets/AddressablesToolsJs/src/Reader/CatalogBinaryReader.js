import { uint } from '../constants.js'
import { BinaryReader } from './BinaryReader.js'

export class CatalogBinaryReader extends BinaryReader {
    constructor(buffer, patcher = null, handler = null) {
        super(buffer)
        this.Version = 1
        this._objCache = {}
        this._patcher = patcher || ((s) => s)
        this._handler = handler || ((reader, offset, isDefault) => null)
    }

    cacheAndReturn(offset, obj) {
        this._objCache[offset] = obj
        return obj
    }

    tryGetCachedObject(offset, objType) {
        return this._objCache[offset] ?? null
    }

    _readBasicString(offset, unicode) {
        this.seek(offset - 4)
        const length = this.readInt32()
        const data = this.readBytes(length)
        const decoder = new TextDecoder(unicode ? 'utf-16le' : 'ascii')
        return decoder.decode(data)
    }

    _readDynamicString(offset, sep) {
        this.seek(offset)
        const partStrs = []
        while (true) {
            const partStringOffset = this.readUint32()
            const nextPartOffset = this.readUint32()
            partStrs.push(this.readEncodedString(partStringOffset))
            if (nextPartOffset === uint.MaxValue) break
            this.seek(nextPartOffset)
        }
        if (partStrs.length === 1) return partStrs[0]
        if (this.Version > 1) partStrs.reverse()
        return partStrs.join(sep)
    }

    readEncodedString(encodedOffset, dynSep = '\0') {
        if (encodedOffset === uint.MaxValue || encodedOffset === uint.MaxValue_) return null
        const cached = this.tryGetCachedObject(encodedOffset, String)
        if (cached != null) return cached

        const unicode = (encodedOffset & 0x80000000) !== 0
        const dynamic = (encodedOffset & 0x40000000) !== 0 && dynSep !== '\0'
        const offset = encodedOffset & 0x3fffffff

        const result = dynamic ? this._readDynamicString(offset, dynSep) : this._readBasicString(offset, unicode)
        return this.cacheAndReturn(encodedOffset, result)
    }

    readOffsetArray(encodedOffset) {
        if (encodedOffset === uint.MaxValue) return []
        const cached = this.tryGetCachedObject(encodedOffset, Array)
        if (cached != null) return cached

        this.seek(encodedOffset - 4)
        const byteSize = this.readInt32()
        if (byteSize % 4 !== 0) throw new Error('Array size must be a multiple of 4')
        const count = byteSize / 4
        const arr = []
        for (let i = 0; i < count; i++) arr.push(this.readUint32())
        return this.cacheAndReturn(encodedOffset, arr)
    }

    readCustom(offset, fetchFunc) {
        if (offset in this._objCache) return this._objCache[offset]
        const obj = fetchFunc()
        this._objCache[offset] = obj
        return obj
    }
}
