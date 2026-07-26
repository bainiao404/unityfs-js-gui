import { base64ToArrayBuffer } from '../utils.js'
import { ObjectInitializationData } from './ObjectInitializationData.js'
import { ResourceLocation } from './ResourceLocation.js'
import { SerializedObjectDecoder } from './SerializedObjectDecoder.js'
import { SerializedType } from './SerializedType.js'
import { ContentCatalogDataBinaryHeader } from '../Binary/ContentCatalogDataBinaryHeader.js'
import { CatalogBinaryReader } from '../Reader/CatalogBinaryReader.js'
import { BinaryReader } from '../Reader/BinaryReader.js'
import { ClassJsonObject } from './ClassJsonObject.js'
import { AssetBundleRequestOptions } from '../Classes/AssetBundleRequestOptions.js'

class Bucket {
    constructor(offset, entries) {
        this.offset = offset
        this.entries = entries
    }
}

export class ContentCatalogData {
    constructor() {
        this.Version = 0
        this.LocatorId = null
        this.BuildResultHash = null
        this.InstanceProviderData = null
        this.SceneProviderData = null
        this.ResourceProviderData = []
        this.ProviderIds = []
        this.InternalIds = []
        this.Keys = null
        this.ResourceTypes = []
        this.InternalIdPrefixes = []
        this.Resources = {}
    }

    static fromJson(data) {
        const ccd = new ContentCatalogData()
        ccd._readJson(data)
        return ccd
    }

    static fromBinary(reader) {
        const ccd = new ContentCatalogData()
        ccd._readBinary(reader)
        return ccd
    }

    _readJson(data) {
        this.LocatorId = data.m_LocatorId
        this.BuildResultHash = data.m_BuildResultHash

        this.InstanceProviderData = ObjectInitializationData.fromJson(data.m_InstanceProviderData)
        this.SceneProviderData = ObjectInitializationData.fromJson(data.m_SceneProviderData)
        this.ResourceProviderData = data.m_ResourceProviderData.map((d) => ObjectInitializationData.fromJson(d))

        this.ProviderIds = data.m_ProviderIds
        this.InternalIds = data.m_InternalIds
        this.Keys = data.m_Keys
        this.ResourceTypes = data.m_resourceTypes.map((t) => SerializedType.fromJson(t))
        this.InternalIdPrefixes = data.m_InternalIdPrefixes

        this._readResourcesJson(data)
    }

    _readBinary(reader) {
        const header = new ContentCatalogDataBinaryHeader()
        header.read(reader)

        this.Version = reader.Version
        this.LocatorId = reader.readEncodedString(header.IdOffset)
        this.BuildResultHash = reader.readEncodedString(header.BuildResultHashOffset)

        this.InstanceProviderData = ObjectInitializationData.fromBinary(reader, header.InstanceProviderOffset)
        this.SceneProviderData = ObjectInitializationData.fromBinary(reader, header.SceneProviderOffset)

        const resourceProviderDataOffsets = reader.readOffsetArray(header.InitObjectsArrayOffset)
        this.ResourceProviderData = resourceProviderDataOffsets.map((offset) =>
            ObjectInitializationData.fromBinary(reader, offset),
        )

        this._readResourcesBinary(reader, header)
    }

    _readResourcesJson(data) {
        const bucketBuffer = base64ToArrayBuffer(data.m_BucketDataString)
        const bucketReader = new BinaryReader(bucketBuffer)
        const bucketCount = bucketReader.readInt32()
        const buckets = []
        for (let i = 0; i < bucketCount; i++) {
            const offset = bucketReader.readInt32()
            const entryCount = bucketReader.readInt32()
            const entries = []
            for (let j = 0; j < entryCount; j++) entries.push(bucketReader.readInt32())
            buckets.push(new Bucket(offset, entries))
        }

        const keys = []
        const keyDataBuffer = base64ToArrayBuffer(data.m_KeyDataString)
        const keyReader = new BinaryReader(keyDataBuffer)
        const keyCount = keyReader.readInt32()
        for (let i = 0; i < keyCount; i++) {
            keyReader.seek(buckets[i].offset)
            keys.push(SerializedObjectDecoder.decodeV1(keyReader))
        }

        const locations = []
        const entryDataBuffer = base64ToArrayBuffer(data.m_EntryDataString)
        const extraDataBuffer = base64ToArrayBuffer(data.m_ExtraDataString)
        const entryReader = new BinaryReader(entryDataBuffer)
        const extraReader = new BinaryReader(extraDataBuffer)
        const entryCount = entryReader.readInt32()

        for (let i = 0; i < entryCount; i++) {
            const internalIdIndex = entryReader.readInt32()
            const providerIndex = entryReader.readInt32()
            const dependencyKeyIndex = entryReader.readInt32()
            const depHash = entryReader.readInt32()
            const dataIndex = entryReader.readInt32()
            const primaryKeyIndex = entryReader.readInt32()
            const resourceTypeIndex = entryReader.readInt32()

            let internalId = this.InternalIds[internalIdIndex]
            const splitIndex = internalId.indexOf('#')
            if (splitIndex !== -1) {
                try {
                    const prefixIndex = parseInt(internalId.substring(0, splitIndex), 10)
                    internalId = this.InternalIdPrefixes[prefixIndex] + internalId.substring(splitIndex + 1)
                } catch (e) {
                    // ignore
                }
            }

            const providerId = this.ProviderIds[providerIndex]
            const dependencyKey = dependencyKeyIndex >= 0 ? keys[dependencyKeyIndex] : null

            let objData = null
            if (dataIndex >= 0) {
                extraReader.seek(dataIndex)
                objData = SerializedObjectDecoder.decodeV1(extraReader)
            }

            const primaryKey = this.Keys == null ? keys[primaryKeyIndex] : this.Keys[primaryKeyIndex]
            const resourceType = this.ResourceTypes[resourceTypeIndex]

            const loc = new ResourceLocation()
            loc._readJson(internalId, providerId, dependencyKey, objData, depHash, primaryKey, resourceType)
            locations.push(loc)
        }

        this.Resources = {}
        for (let i = 0; i < buckets.length; i++) {
            const bucket = buckets[i]
            this.Resources[keys[i]] = bucket.entries.map((e) => locations[e])
        }
    }

    _readResourcesBinary(reader, header) {
        const keyLocationOffsets = reader.readOffsetArray(header.KeysOffset)
        this.Resources = {}
        for (let i = 0; i < keyLocationOffsets.length; i += 2) {
            const keyOffset = keyLocationOffsets[i]
            const locationListOffset = keyLocationOffsets[i + 1]
            const key = SerializedObjectDecoder.decodeV2(reader, keyOffset, reader._patcher, reader._handler)
            const locationOffsets = reader.readOffsetArray(locationListOffset)
            this.Resources[key] = locationOffsets.map((offset) =>
                reader.readCustom(offset, () => ResourceLocation.fromBinary(reader, offset)),
            )
        }
    }
}
