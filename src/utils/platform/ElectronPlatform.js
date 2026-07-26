import { PlatformAdapter } from './PlatformAdapter'

const electron = typeof window !== 'undefined' && window.require ? window.require('electron') : null

export class ElectronPlatform extends PlatformAdapter {
    get isElectron() {
        return true
    }
    get name() {
        return 'Electron'
    }

    async selectFilesOrFolder(options = { type: 'file' }) {
        if (!electron || !electron.ipcRenderer) return []
        const result = await electron.ipcRenderer.invoke('show-open-dialog', {
            properties: options.type === 'file' ? ['openFile', 'multiSelections'] : ['openDirectory'],
        })
        if (result.canceled) return []
        return result.filePaths.map((p) => ({
            path: p.replace(/\\/g, '/'),
            type: options.type,
        }))
    }

    async selectDirectory() {
        if (!electron || !electron.ipcRenderer) return ''
        const result = await electron.ipcRenderer.invoke('show-open-dialog', {
            properties: ['openDirectory'],
        })
        if (result.canceled || result.filePaths.length === 0) return ''
        return result.filePaths[0].replace(/\\/g, '/').replace(/\/$/, '') + '/'
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

    openInExplorer(filePath) {
        if (electron && electron.shell) {
            const path = window.require ? window.require('path') : null
            const resolvedPath = path ? path.resolve(filePath) : filePath
            electron.shell.showItemInFolder(resolvedPath)
        }
    }
}
