import { SerializedType } from './SerializedType.js'

export class ClassJsonObject {
    constructor(assemblyName, className, jsonText) {
        this.Type = new SerializedType(assemblyName, className)
        this.JsonText = jsonText
    }

    toString() {
        return `ClassJsonObject(Type=${this.Type})`
    }
}
