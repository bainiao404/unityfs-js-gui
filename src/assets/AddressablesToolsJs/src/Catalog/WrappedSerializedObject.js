import { SerializedType } from './SerializedType.js'

export class WrappedSerializedObject {
    constructor(type, obj) {
        this.Type = type
        this.Object = obj
    }

    toString() {
        return `WrappedSerializedObject[${this.Object?.constructor?.name}](Type=${this.Type}, Object=${this.Object})`
    }
}
