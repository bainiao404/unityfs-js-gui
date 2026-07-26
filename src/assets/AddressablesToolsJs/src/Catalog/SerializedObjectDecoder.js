import { uint } from '../constants.js'
import { ClassJsonObject } from './ClassJsonObject.js'
import { SerializedType } from './SerializedType.js'
import { WrappedSerializedObject } from './WrappedSerializedObject.js'
import { AssetBundleRequestOptions } from '../Classes/AssetBundleRequestOptions.js'
import { Hash128 } from '../Classes/Hash128.js'
import { TypeReference } from '../Classes/TypeReference.js'
import { BinaryReader } from '../Reader/BinaryReader.js'
import { CatalogBinaryReader } from '../Reader/CatalogBinaryReader.js'

const ObjectType = {
    AsciiString: 0,
    UnicodeString: 1,
    UInt16: 2,
    UInt32: 3,
    Int32: 4,
    Hash128: 5,
    Type: 6,
    JsonObject: 7,
}

const INT_TYPENAME = 'System.Int32'
const LONG_TYPENAME = 'System.Int64'
const BOOL_TYPENAME = 'System.Boolean'
const STRING_TYPENAME = 'System.String'
const HASH128_TYPENAME = 'UnityEngine.Hash128'
const ABRO_TYPENAME = 'UnityEngine.ResourceManagement.ResourceProviders.AssetBundleRequestOptions'

const INT_MATCHNAME = 'mscorlib; ' + INT_TYPENAME
const LONG_MATCHNAME = 'mscorlib; ' + LONG_TYPENAME
const BOOL_MATCHNAME = 'mscorlib; ' + BOOL_TYPENAME
const STRING_MATCHNAME = 'mscorlib; ' + STRING_TYPENAME
const HASH128_MATCHNAME = 'UnityEngine.CoreModule; ' + HASH128_TYPENAME
const ABRO_MATCHNAME = 'Unity.ResourceManager; ' + ABRO_TYPENAME

function readString1(br) {
    const length = br.readByte()
    const bytes = br.readBytes(length)
    return new TextDecoder('ascii').decode(bytes)
}

function readString4(br) {
    const length = br.readInt32()
    const bytes = br.readBytes(length)
    return new TextDecoder('ascii').decode(bytes)
}

function readString4Unicode(br) {
    const length = br.readInt32()
    const bytes = br.readBytes(length)
    return new TextDecoder('utf-16le').decode(bytes)
}

export class SerializedObjectDecoder {
    static decodeV1(br) {
        const type = br.readByte()
        switch (type) {
            case ObjectType.AsciiString:
                return readString4(br)
            case ObjectType.UnicodeString:
                return readString4Unicode(br)
            case ObjectType.UInt16:
                return br.readUint16()
            case ObjectType.UInt32:
                return br.readUint32()
            case ObjectType.Int32:
                return br.readInt32()
            case ObjectType.Hash128:
                return new Hash128(readString1(br))
            case ObjectType.Type:
                return new TypeReference(readString1(br))
            case ObjectType.JsonObject: {
                const assemblyName = readString1(br)
                const className = readString1(br)
                const jsonText = readString4Unicode(br)
                const jsonObj = new ClassJsonObject(assemblyName, className, jsonText)
                const matchName = jsonObj.Type.getMatchName()
                if (matchName === ABRO_MATCHNAME) {
                    return new WrappedSerializedObject(jsonObj.Type, AssetBundleRequestOptions.fromJson(jsonText))
                }
                return jsonObj
            }
            default:
                return null
        }
    }

    static decodeV2(reader, offset, patcher, handler) {
        if (offset === uint.MaxValue) return null

        reader.seek(offset)
        const typeNameOffset = reader.readUint32()
        const objectOffset = reader.readUint32()
        const isDefaultObject = objectOffset === uint.MaxValue

        const serializedType = reader.readCustom(typeNameOffset, () =>
            SerializedType.fromBinary(reader, typeNameOffset),
        )
        const matchName = serializedType.getMatchName()
        const patched = patcher(matchName)

        switch (patched) {
            case INT_MATCHNAME:
                if (isDefaultObject) return 0
                reader.seek(objectOffset)
                return reader.readInt32()
            case LONG_MATCHNAME:
                if (isDefaultObject) return 0
                reader.seek(objectOffset)
                return reader.readInt64()
            case BOOL_MATCHNAME:
                if (isDefaultObject) return false
                reader.seek(objectOffset)
                return reader.readBoolean()
            case STRING_MATCHNAME:
                if (isDefaultObject) return null
                reader.seek(objectOffset)
                const stringOffset = reader.readUint32()
                const separator = reader.readChar()
                return reader.readEncodedString(stringOffset, separator)
            case HASH128_MATCHNAME:
                if (isDefaultObject) return null
                reader.seek(objectOffset)
                return new Hash128(...reader.read4Uint32())
            case 'GeePlus.GPUL.AddressablesManager; GeePlus.GPUL.AddressablesManager.ResourceProviders.EncryptedAssetBundleRequestOptions':
            case ABRO_MATCHNAME:
                if (isDefaultObject) return null
                const obj = reader.readCustom(objectOffset, () =>
                    AssetBundleRequestOptions.fromBinary(reader, objectOffset),
                )
                return new WrappedSerializedObject(serializedType, obj)
            case null:
            case undefined:
                return handler(reader, objectOffset, isDefaultObject)
            default:
                throw new Error(`Unsupported object type: ${matchName}`)
        }
    }
}
