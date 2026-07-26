/**
 * AddressablesToolsJs - A JavaScript library for parsing Unity Addressables catalog files.
 * Port of AddressablesToolsPy
 */

export const __version__ = '0.1.7'

export { parse, parseJson, parseBinary, AddressablesCatalogFileParser } from './parser.js'
export { ContentCatalogData } from './Catalog/ContentCatalogData.js'
export { ClassJsonObject } from './Catalog/ClassJsonObject.js'
export { SerializedType } from './Catalog/SerializedType.js'
export { ResourceLocation } from './Catalog/ResourceLocation.js'
export { ObjectInitializationData } from './Catalog/ObjectInitializationData.js'
export { SerializedObjectDecoder } from './Catalog/SerializedObjectDecoder.js'
export { WrappedSerializedObject } from './Catalog/WrappedSerializedObject.js'
export { TypeReference } from './Classes/TypeReference.js'
export { Hash128 } from './Classes/Hash128.js'
export { AssetBundleRequestOptions, AssetLoadMode } from './Classes/AssetBundleRequestOptions.js'
export { CatalogBinaryReader } from './Reader/CatalogBinaryReader.js'
