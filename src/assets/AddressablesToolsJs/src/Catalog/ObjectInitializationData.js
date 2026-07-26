import { SerializedType } from './SerializedType.js'
import { CatalogBinaryReader } from '../Reader/CatalogBinaryReader.js'

export class ObjectInitializationData {
    constructor(id, objectType, data) {
        this.Id = id
        this.ObjectType = objectType
        this.Data = data
    }

    static fromJson(obj) {
        return new ObjectInitializationData(obj.m_Id, SerializedType.fromJson(obj.m_ObjectType), obj.m_Data)
    }

    static fromBinary(reader, offset) {
        reader.seek(offset)
        const idOffset = reader.readUint32()
        const objectTypeOffset = reader.readUint32()
        const dataOffset = reader.readUint32()
        return new ObjectInitializationData(
            reader.readEncodedString(idOffset),
            SerializedType.fromBinary(reader, objectTypeOffset),
            reader.readEncodedString(dataOffset),
        )
    }

    toString() {
        return `ObjectInitializationData(Id=${this.Id}, ObjectType=${this.ObjectType}, Data=${this.Data})`
    }
}
