import { SerializedType } from './SerializedType.js'
import { SerializedObjectDecoder } from './SerializedObjectDecoder.js'
import { CatalogBinaryReader } from '../Reader/CatalogBinaryReader.js'
import { AssetBundleRequestOptions } from '../Classes/AssetBundleRequestOptions.js'

export class ResourceLocation {
    constructor() {
        this.InternalId = null
        this.ProviderId = null
        this.DependencyKey = null
        this.Dependencies = null
        this.Data = null
        this.HashCode = 0
        this.DependencyHashCode = 0
        this.PrimaryKey = null
        this.Type = null
    }

    static fromBinary(reader, offset) {
        const obj = new ResourceLocation()
        obj._readBinary(reader, offset)
        return obj
    }

    _readJson(internalId, providerId, dependencyKey, objData, depHash, primaryKey, resourceType) {
        this.InternalId = internalId
        this.ProviderId = providerId
        this.DependencyKey = dependencyKey
        this.Dependencies = null
        this.Data = objData
        this.HashCode = (hashCode(this.InternalId) * 31 + hashCode(this.ProviderId)) | 0
        this.DependencyHashCode = depHash
        this.PrimaryKey = String(primaryKey)
        this.Type = resourceType
    }

    _readBinary(reader, offset) {
        reader.seek(offset)
        const primaryKeyOffset = reader.readUint32()
        const internalIdOffset = reader.readUint32()
        const providerIdOffset = reader.readUint32()
        const dependenciesOffset = reader.readUint32()
        const dependencyHashCode = reader.readInt32()
        const dataOffset = reader.readUint32()
        const typeOffset = reader.readUint32()

        this.PrimaryKey = reader.readEncodedString(primaryKeyOffset, '/')
        this.InternalId = reader.readEncodedString(internalIdOffset, '/')
        this.ProviderId = reader.readEncodedString(providerIdOffset, '.')

        const dependenciesOffsets = reader.readOffsetArray(dependenciesOffset)
        const dependencies = []
        for (const objectOffset of dependenciesOffsets) {
            dependencies.push(reader.readCustom(objectOffset, () => ResourceLocation.fromBinary(reader, objectOffset)))
        }
        this.DependencyKey = null
        this.Dependencies = dependencies

        this.DependencyHashCode = dependencyHashCode
        this.Data = SerializedObjectDecoder.decodeV2(reader, dataOffset, reader._patcher, reader._handler)
        this.Type = reader.readCustom(typeOffset, () => SerializedType.fromBinary(reader, typeOffset))
    }

    toString() {
        return `ResourceLocation(InternalId=${this.InternalId}, ProviderId=${this.ProviderId}, ...)`
    }
}

function hashCode(str) {
    if (str == null) return 0
    let h = 0
    for (let i = 0; i < str.length; i++) {
        h = ((h << 5) - h + str.charCodeAt(i)) | 0
    }
    return h
}
