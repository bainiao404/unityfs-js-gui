import { Hash128 } from './Hash128.js'
import { CatalogBinaryReader } from '../Reader/CatalogBinaryReader.js'

export const AssetLoadMode = {
    RequestedAssetAndDependencies: 0,
    AllPackedAssetsAndDependencies: 1,
}

export class AssetBundleRequestOptions {
    constructor() {
        this.Hash = ''
        this.Crc = 0
        this.ComInfo = null
        this.BundleName = null
        this.BundleSize = 0
    }

    static fromJson(jsonText) {
        const obj = new AssetBundleRequestOptions()
        obj._readJson(jsonText)
        return obj
    }

    static fromBinary(reader, offset) {
        const obj = new AssetBundleRequestOptions()
        obj._readBinary(reader, offset)
        return obj
    }

    _readJson(jsonText) {
        try {
            const jsonObj = JSON.parse(jsonText)
            if (!jsonObj) return

            this.Hash = jsonObj.m_Hash
            this.Crc = jsonObj.m_Crc
            this.BundleName = jsonObj.m_BundleName
            this.BundleSize = jsonObj.m_BundleSize

            let commonInfoVersion
            if (jsonObj.m_ChunkedTransfer == null) commonInfoVersion = 1
            else if (
                jsonObj.m_AssetLoadMode == null &&
                jsonObj.m_UseCrcForCachedBundles == null &&
                jsonObj.m_UseUWRForLocalBundles == null &&
                jsonObj.m_ClearOtherCachedVersionsWhenLoaded == null
            )
                commonInfoVersion = 2
            else commonInfoVersion = 3

            this.ComInfo = new CommonInfo(
                jsonObj.m_Timeout,
                jsonObj.m_RedirectLimit,
                jsonObj.m_RetryCount,
                jsonObj.m_AssetLoadMode ?? 0,
                jsonObj.m_ChunkedTransfer,
                jsonObj.m_UseCrcForCachedBundle ?? false,
                jsonObj.m_UseUWRForLocalBundles ?? false,
                jsonObj.m_ClearOtherCachedVersionsWhenLoaded ?? false,
                commonInfoVersion,
            )
        } catch (e) {
            if (e instanceof SyntaxError) return
            throw e
        }
    }

    _readBinary(reader, offset) {
        reader.seek(offset)

        const hashOffset = reader.readUint32()
        const bundleNameOffset = reader.readUint32()
        const crc = reader.readUint32()
        const bundleSize = reader.readUint32()
        const commonInfoOffset = reader.readUint32()

        reader.seek(hashOffset)
        this.Hash = new Hash128(...reader.read4Uint32()).Value

        this.BundleName = reader.readEncodedString(bundleNameOffset, '_')
        this.Crc = crc
        this.BundleSize = bundleSize

        this.ComInfo = reader.readCustom(commonInfoOffset, () => CommonInfo.fromBinary(reader, commonInfoOffset))
        this.ComInfo.Version = 3
    }

    toString() {
        return `AssetBundleRequestOptions(Hash=${this.Hash}, Crc=${this.Crc}, ...)`
    }
}

class CommonInfo {
    constructor(
        timeout = 0,
        redirectLimit = 0,
        retryCount = 0,
        assetLoadMode = AssetLoadMode.AllPackedAssetsAndDependencies,
        chunkedTransfer = false,
        useCrcForCachedBundle = false,
        useUnityWebRequestForLocalBundles = false,
        clearOtherCachedVersionsWhenLoaded = false,
        version = 0,
    ) {
        this.Timeout = timeout
        this.RedirectLimit = redirectLimit
        this.RetryCount = retryCount
        this.AssetLoadMode = assetLoadMode
        this.ChunkedTransfer = chunkedTransfer
        this.UseCrcForCachedBundle = useCrcForCachedBundle
        this.UseUnityWebRequestForLocalBundles = useUnityWebRequestForLocalBundles
        this.ClearOtherCachedVersionsWhenLoaded = clearOtherCachedVersionsWhenLoaded
        this.Version = version
    }

    static fromBinary(reader, offset) {
        const obj = new CommonInfo()
        obj._read(reader, offset)
        return obj
    }

    _read(reader, offset) {
        reader.seek(offset)

        const timeout = reader.readInt16()
        const redirectLimit = reader.readByte()
        const retryCount = reader.readByte()
        const flags = reader.readInt32()

        this.Timeout = timeout
        this.RedirectLimit = redirectLimit
        this.RetryCount = retryCount

        this.AssetLoadMode =
            (flags & 1) !== 0
                ? AssetLoadMode.AllPackedAssetsAndDependencies
                : AssetLoadMode.RequestedAssetAndDependencies
        this.ChunkedTransfer = (flags & 2) !== 0
        this.UseCrcForCachedBundle = (flags & 4) !== 0
        this.UseUnityWebRequestForLocalBundles = (flags & 8) !== 0
        this.ClearOtherCachedVersionsWhenLoaded = (flags & 16) !== 0
    }
}
