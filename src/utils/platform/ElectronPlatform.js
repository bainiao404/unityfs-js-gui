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

    async prepareDragOut(item, itemsToExport, config) {
        const fs = window.require ? window.require('fs') : null
        const path = window.require ? window.require('path') : null
        const os = window.require ? window.require('os') : null
        if (!fs || !path || !os) return []

        const { UnityFSGui } = await import('@/assets/unityfs-gui')

        try {
            const tempDir = path.join(os.tmpdir(), 'UnityJS-GUI-DragExport')
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true })
            }

            const exportPromises = itemsToExport.map(async (currentItem) => {
                const assetManager = await UnityFSGui.assetManagers.get(currentItem.assetManagerId)
                const object = currentItem.pathID
                    ? assetManager.getObjectInfoByPathId(BigInt(currentItem.pathID))
                    : assetManager.getObjectInfos()?.[currentItem.objectId]

                if (!object) return null

                let rawData
                let fileName = object.name

                const exportConfig = {
                    type: 'arrayBuffer',
                    worker: true,
                    cutting: object.className === 'Sprite' ? config.spriteCutting : false,
                }

                const fileInfo = await assetManager.exportFile(object, exportConfig)
                if (fileInfo && fileInfo.isFolder) {
                    const modelTempPaths = []
                    for (const [subPath, subData] of Object.entries(fileInfo.files)) {
                        const tempFilePath = path.join(tempDir, fileInfo.name, subPath)
                        const fileDir = path.dirname(tempFilePath)
                        if (!fs.existsSync(fileDir)) {
                            fs.mkdirSync(fileDir, { recursive: true })
                        }
                        const bufferData = subData instanceof Uint8Array
                            ? Buffer.from(subData.buffer, subData.byteOffset, subData.byteLength)
                            : Buffer.from(subData)
                        fs.writeFileSync(tempFilePath, bufferData)
                        modelTempPaths.push(tempFilePath)
                    }
                    return modelTempPaths
                }

                if (!fileInfo || (!fileInfo.data && !fileInfo.data?.raw)) {
                    const reader = object._reader
                    if (reader) {
                        const currentOffset = reader.offset
                        reader.seek(object.offset)
                        rawData = reader.read(object.size)
                        reader.seek(currentOffset)
                        const ext = object.object?.exportExtension || '.dat'
                        if (!fileName.includes('.') && ext) {
                            fileName += ext
                        }
                    }
                } else {
                    rawData = fileInfo?.data?.raw
                    fileName = fileInfo.src.split(/[\\/]/).pop()
                }

                if (!rawData) return null

                const tempFilePath = path.join(tempDir, fileName)

                let bufferData
                if (rawData instanceof Uint8Array) {
                    bufferData = Buffer.from(rawData.buffer, rawData.byteOffset, rawData.byteLength)
                } else if (rawData instanceof ArrayBuffer) {
                    bufferData = Buffer.from(rawData)
                } else {
                    bufferData = Buffer.from(rawData)
                }

                fs.writeFileSync(tempFilePath, bufferData)
                return tempFilePath
            })

            const exportedPathsResults = await Promise.all(exportPromises)
            const exportedPaths = exportedPathsResults.flat().filter(Boolean)
            return exportedPaths
        } catch (e) {
            console.error('Pre-export failed:', e)
            return []
        }
    }

    startDragOut(tempFilePaths) {
        if (!electron || !electron.ipcRenderer) return
        const path = window.require ? window.require('path') : null
        const iconPath = path && window.__dirname ? path.join(window.__dirname, 'Export.png') : ''

        if (tempFilePaths.length === 1) {
            electron.ipcRenderer.send('ondragstart', {
                filePath: tempFilePaths[0],
                iconPath: iconPath,
                iconSize: { width: 32, height: 32 },
            })
        } else {
            electron.ipcRenderer.send('ondragstart', {
                filePaths: tempFilePaths,
                iconPath: iconPath,
                iconSize: { width: 32, height: 32 },
            })
        }
    }
}
