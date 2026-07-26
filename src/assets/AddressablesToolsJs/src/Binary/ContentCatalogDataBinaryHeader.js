import { uint } from '../constants.js'
import { CatalogBinaryReader } from '../Reader/CatalogBinaryReader.js'

export class ContentCatalogDataBinaryHeader {
    constructor() {
        this.Magic = 0
        this.Version = 0
        this.KeysOffset = 0
        this.IdOffset = 0
        this.InstanceProviderOffset = 0
        this.SceneProviderOffset = 0
        this.InitObjectsArrayOffset = 0
        this.BuildResultHashOffset = 0
    }

    read(reader) {
        this.Magic = reader.readInt32()
        this.Version = reader.readInt32()
        if (this.Version !== 1 && this.Version !== 2) {
            throw new Error('Only versions 1 and 2 are supported')
        }
        reader.Version = this.Version

        this.KeysOffset = reader.readUint32()
        this.IdOffset = reader.readUint32()
        this.InstanceProviderOffset = reader.readUint32()
        this.SceneProviderOffset = reader.readUint32()
        this.InitObjectsArrayOffset = reader.readUint32()
        this.BuildResultHashOffset =
            this.Version === 1 && this.KeysOffset === 0x20 ? uint.MaxValue : reader.readUint32()
    }
}
