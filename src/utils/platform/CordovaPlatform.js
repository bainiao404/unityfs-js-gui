import { ref } from 'vue'
import { PlatformAdapter } from './PlatformAdapter'

export class CordovaPlatform extends PlatformAdapter {
    constructor() {
        super()
        this.cordovaFileViewVisible = ref(false)
        this.cordovaOpenType = ref('file')
        this.openPath = ref('')
        this._resolveSelection = null
    }

    get isCordova() {
        return true
    }
    get name() {
        return 'Cordova'
    }

    async selectFilesOrFolder(options = { type: 'file' }) {
        this.cordovaOpenType.value = options.type
        this.cordovaFileViewVisible.value = true
        return new Promise((resolve) => {
            this._resolveSelection = resolve
        })
    }

    resolveSelection(selection) {
        if (this._resolveSelection) {
            this._resolveSelection(selection)
            this._resolveSelection = null
        }
    }

    async selectDirectory() {
        const selection = await this.selectFilesOrFolder({ type: 'folder' })
        if (!selection) return ''
        // Custom selection returns path
        const item = Array.isArray(selection) ? selection[0] : selection
        return item ? item.path : ''
    }

    async saveFile(cleanPath, data, options = {}) {
        const { PlatformFS } = await import('../fs/PlatformFS')
        const root = options.lastSavedDirectory || ''
        const normalizedPath = cleanPath
            .replace(/\\/g, '/')
            .replace(/^\//, '')
            .replace(/[\*\|\<\>\"\?\:]/g, '')
        const fullPath = root ? `${root}/${normalizedPath}` : normalizedPath
        await PlatformFS.saveFile(fullPath, data)
    }

    async saveFolder(folderName, filesMap, options = {}) {
        for (const [subPath, subData] of Object.entries(filesMap)) {
            await this.saveFile(`${folderName}/${subPath}`, subData, options)
        }
    }
}
