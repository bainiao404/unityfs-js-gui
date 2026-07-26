import { SerializedTypeJson } from '../JSON/SerializedTypeJson.js'
import { CatalogBinaryReader } from '../Reader/CatalogBinaryReader.js'

export class SerializedType {
    constructor(assemblyName, className) {
        this.AssemblyName = assemblyName
        this.ClassName = className
    }

    static fromJson(type) {
        return new SerializedType(type.m_AssemblyName, type.m_ClassName)
    }

    static fromBinary(reader, offset) {
        reader.seek(offset)
        const assemblyNameOffset = reader.readUint32()
        const classNameOffset = reader.readUint32()
        return new SerializedType(
            reader.readEncodedString(assemblyNameOffset, '.'),
            reader.readEncodedString(classNameOffset, '.'),
        )
    }

    getMatchName() {
        return this.getAssemblyShortName() + '; ' + this.ClassName
    }

    getAssemblyShortName() {
        if (this.AssemblyName.indexOf(',') === -1) throw new Error('AssemblyName must have commas')
        return this.AssemblyName.split(',')[0]
    }

    equals(obj) {
        return (
            obj instanceof SerializedType && obj.AssemblyName === this.AssemblyName && obj.ClassName === this.ClassName
        )
    }

    toString() {
        return `SerializedType(AssemblyName=${this.AssemblyName}, ClassName=${this.ClassName})`
    }
}
