import { ContentCatalogData } from './Catalog/ContentCatalogData.js'
import { SerializedTypeJson } from './JSON/SerializedTypeJson.js'
import { ObjectInitializationDataJson } from './JSON/ObjectInitializationDataJson.js'
import { ContentCatalogDataJson } from './JSON/ContentCatalogDataJson.js'
import { CatalogBinaryReader } from './Reader/CatalogBinaryReader.js'

function serializedTypeDecoder(obj) {
    return new SerializedTypeJson(obj.m_AssemblyName, obj.m_ClassName)
}

function objectInitializationDataDecoder(obj) {
    const m_ObjectType = new SerializedTypeJson(obj.m_ObjectType.m_AssemblyName, obj.m_ObjectType.m_ClassName)
    return new ObjectInitializationDataJson(obj.m_Id, m_ObjectType, obj.m_Data)
}

function contentCatalogDataDecoder(obj) {
    const _inst = obj.m_InstanceProviderData
    const _scene = obj.m_SceneProviderData
    const m_InstanceProviderData = new ObjectInitializationDataJson(
        _inst.m_Id,
        new SerializedTypeJson(_inst.m_ObjectType.m_AssemblyName, _inst.m_ObjectType.m_ClassName),
        _inst.m_Data,
    )
    const m_SceneProviderData = new ObjectInitializationDataJson(
        _scene.m_Id,
        new SerializedTypeJson(_scene.m_ObjectType.m_AssemblyName, _scene.m_ObjectType.m_ClassName),
        _scene.m_Data,
    )
    const m_ResourceProviderData = obj.m_ResourceProviderData.map(
        (o) =>
            new ObjectInitializationDataJson(
                o.m_Id,
                new SerializedTypeJson(o.m_ObjectType.m_AssemblyName, o.m_ObjectType.m_ClassName),
                o.m_Data,
            ),
    )
    return new ContentCatalogDataJson(
        obj.m_LocatorId,
        obj.m_BuildResultHash,
        m_InstanceProviderData,
        m_SceneProviderData,
        m_ResourceProviderData,
        obj.m_ProviderIds,
        obj.m_InternalIds,
        obj.m_KeyDataString,
        obj.m_BucketDataString,
        obj.m_EntryDataString,
        obj.m_ExtraDataString,
        obj.m_Keys ?? null,
        obj.m_resourceTypes.map((o) => new SerializedTypeJson(o.m_AssemblyName, o.m_ClassName)),
        obj.m_InternalIdPrefixes ?? [],
    )
}

export class AddressablesCatalogFileParser {
    static fromBinary(data, patcher = null, handler = null) {
        let buffer
        if (data instanceof ArrayBuffer) buffer = data
        else if (ArrayBuffer.isView(data))
            buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
        else buffer = data
        const reader = new CatalogBinaryReader(buffer, patcher, handler)
        return ContentCatalogData.fromBinary(reader)
    }

    static fromJson(data) {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data
        const ccdJson = contentCatalogDataDecoder(parsed)
        return ContentCatalogData.fromJson(ccdJson)
    }
}

export function parse(data, patcher = null, handler = null) {
    if (typeof data === 'string') {
        return AddressablesCatalogFileParser.fromJson(data)
    }
    return AddressablesCatalogFileParser.fromBinary(data, patcher, handler)
}

export function parseJson(data) {
    return AddressablesCatalogFileParser.fromJson(data)
}

export function parseBinary(data, patcher = null, handler = null) {
    return AddressablesCatalogFileParser.fromBinary(data, patcher, handler)
}
