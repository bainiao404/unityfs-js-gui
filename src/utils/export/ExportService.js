import { UnityFSGui } from '@/assets/unityfs-gui'
import { platform } from '@/utils/platform'
import { ExportTaskExecutor } from './ExportTaskExecutor'
import JSZip from 'jszip'

export class ExportServiceClass {
    constructor() {
        this.appData = null
        this.i18nStore = null
    }

    /**
     * Initialize the service with the stores
     * @param {Object} appData AppData store instance
     * @param {Object} i18nStore i18nStore instance
     */
    init(appData, i18nStore) {
        this.appData = appData
        this.i18nStore = i18nStore
    }

    /**
     * Get the save root path (native only)
     * @private
     */
    async _getSaveRootPath() {
        if (!this.appData) return ''
        const { lastSavedDirectory, lastDefaultSavedDirectory } = this.appData.config.data
        const root = lastSavedDirectory || lastDefaultSavedDirectory
        if (root) return root

        if (platform.isCordova) {
            return window.cordova.file.externalRootDirectory + 'Download/'
        }
        if (platform.isElectron) {
            return await platform.selectDirectory()
        }
        return ''
    }

    /**
     * Resolve filename and directory for a resource
     * @private
     */
    _resolveExportPath(objectInfo, isRaw) {
        const file = objectInfo.assetFile || this.primaryAssetFile
        const container = file?.objects?.find((obj) => obj.pathID === 1n) || null
        let containerPath = ''
        if (container && container.object && typeof container.object.getContainer === 'function') {
            const containerKV = container.object.getContainer(objectInfo)
            if (containerKV) {
                containerPath = containerKV.key || ''
            }
        }

        let dirPath = ''
        let fileName = objectInfo.name || 'unnamed'

        if (containerPath) {
            const dirMatch = containerPath.match(/(.*)\/(.*)/)
            dirPath = dirMatch ? dirMatch[1] : containerPath
        }

        const ext = objectInfo.exportExtension || '.dat'
        if (isRaw) {
            if (!fileName.includes('.') && ext) {
                fileName += ext
            }
        }

        return {
            path: dirPath,
            name: fileName,
            exportExtension: ext,
        }
    }

    /**
     * Export a single resource
     * @param {Object} payload payload with object details
     * @param {number|string} payload.assetManagerId
     * @param {number|string} payload.objectId
     * @param {string} [payload.pathID]
     * @param {boolean} isRaw export raw serialization data
     * @returns {Promise<boolean>}
     */
    async exportSingle(payload, isRaw) {
        try {
            const assetManager = await UnityFSGui.assetManagers.get(payload.assetManagerId)
            const object = payload.pathID
                ? assetManager.getObjectInfoByPathId(BigInt(payload.pathID))
                : assetManager.getObjectInfos()?.[payload.objectId]

            if (!object) throw new Error('未找到资源对象')

            let rawData
            let fileName = object.name
            let rect, width, height
            let isFolder = false
            let folderFiles = null
            let folderName = ''

            if (isRaw) {
                const reader = object._reader
                if (!reader) throw new Error('未找到文件读取器')
                const currentOffset = reader.offset
                reader.seek(object.offset)
                rawData = reader.read(object.size)
                reader.seek(currentOffset)

                const ext = object.object?.exportExtension || '.dat'
                if (!fileName.includes('.') && ext) {
                    fileName += ext
                }
            } else {
                const exportConfig = {
                    type: 'arrayBuffer',
                    worker: true,
                    cutting: object.className === 'Sprite' ? this.appData.config.data.spriteCutting : false,
                }

                const fileInfo = await assetManager.exportFile(object, exportConfig)
                if (fileInfo && fileInfo.isFolder) {
                    isFolder = true
                    folderFiles = fileInfo.files
                    folderName = fileInfo.name
                } else {
                    rawData = fileInfo?.data?.raw
                    fileName = fileInfo.src.split(/[\\/]/).pop()
                    if (fileInfo.data) {
                        rect = fileInfo.data.rect
                        width = fileInfo.data.width
                        height = fileInfo.data.height
                    }
                }
            }

            if (!isFolder && !rawData) throw new Error('资源数据为空')

            if (platform.isWebBrowser && !this.appData.webDirectoryHandle) {
                // Browser without directory permissions: download directly
                if (isFolder) {
                    const zip = new JSZip()
                    for (const [subPath, subData] of Object.entries(folderFiles)) {
                        zip.file(subPath, subData)
                    }
                    const content = await zip.generateAsync({ type: 'blob' })
                    platform.downloadBlob(content, `${folderName}.zip`)
                } else {
                    const blob = rawData instanceof Blob ? rawData : new Blob([rawData])
                    platform.downloadBlob(blob, fileName)
                }
                return true
            }

            // Native or Browser with Directory Permissions
            const root = await this._getSaveRootPath()
            if (!platform.isWebBrowser && !root && !platform.isCordova) return false

            const options = {
                directoryHandle: this.appData.webDirectoryHandle,
                lastSavedDirectory: root,
            }

            if (isFolder) {
                await platform.saveFolder(folderName, folderFiles, options)
            } else {
                await platform.saveFile(fileName, rawData, options)
                if (!isRaw && rect && this.appData.config.data.exportSpritePositionJson) {
                    const jsonStr = JSON.stringify({ rect, width, height }, null, 2)
                    await platform.saveFile(`${fileName}.json`, jsonStr, options)
                }
            }
            return true
        } catch (err) {
            console.error(err)
            throw err
        }
    }

    /**
     * Bulk export resources
     * @param {Array<Object>} exportObjects Objects to export
     * @param {boolean} isRawMode Export raw mode
     * @param {Function} progressCallback callback (completedCount, totalCount)
     * @param {Object} logRef Log handler { add: (text, type) => void }
     */
    async exportBulk(exportObjects, isRawMode, progressCallback, logRef) {
        if (
            !platform.isWebBrowser &&
            !this.appData.config.data.lastSavedDirectory &&
            !this.appData.config.data.lastDefaultSavedDirectory
        ) {
            throw new Error('请先选择导出文件夹')
        }

        const zip = new JSZip()
        let filePathMap = {}

        const executor = new ExportTaskExecutor({
            maxConcurrency: this.appData.config.data.maxTask,
        })

        if (progressCallback) {
            executor.onProgress = progressCallback
        }

        exportObjects.forEach((object, index) => {
            executor.addTask(async () => {
                logRef.add(`Exporting (${index + 1}/${exportObjects.length}): ${object.name}`)
                try {
                    const assetManager = await UnityFSGui.assetManagers.get(object.assetManagerId)
                    const objectInfos = assetManager.getObjectInfos()
                    const objectInfo = objectInfos[object.objectId]

                    if (!objectInfo) throw new Error('未找到资源对象')

                    let rawData
                    let src
                    let rect, width, height

                    const filePath = assetManager.getObjectPathInfo(objectInfo)
                    if (!filePath) throw new Error('无法构建虚拟路径')

                    if (isRawMode) {
                        const reader = objectInfo._reader
                        if (!reader) throw new Error('未找到文件读取器')
                        const currentOffset = reader.offset
                        reader.seek(objectInfo.offset)
                        rawData = reader.read(objectInfo.size)
                        reader.seek(currentOffset)

                        let nameWithExt = objectInfo.name
                        const ext = objectInfo.object?.exportExtension || '.dat'
                        if (!nameWithExt.includes('.') && ext) {
                            nameWithExt += ext
                        }
                        src = filePath.path ? `${filePath.path}/${nameWithExt}` : nameWithExt
                    } else {
                        let exportConfig = { type: 'arrayBuffer', worker: true }
                        if (object.className === 'Sprite') {
                            exportConfig.cutting = this.appData.config.data.spriteCutting
                        }

                        const fileInfo = await assetManager.exportFile(objectInfo, exportConfig)

                        if (fileInfo && fileInfo.isFolder) {
                            const folderPath = filePath.path ? `${filePath.path}/${fileInfo.name}` : fileInfo.name
                            const options = {
                                directoryHandle: this.appData.webDirectoryHandle,
                                lastSavedDirectory:
                                    this.appData.config.data.lastSavedDirectory ||
                                    this.appData.config.data.lastDefaultSavedDirectory,
                                zipInstance: zip,
                            }
                            for (const [subPath, subData] of Object.entries(fileInfo.files)) {
                                const fullSubPath = `${folderPath}/${subPath}`
                                await platform.saveFile(fullSubPath, subData, options)
                            }
                            return
                        }

                        if (!fileInfo || !fileInfo.data || !fileInfo.data.raw) {
                            logRef.add(`❌ Object data empty: ${object.name}`, 'error')
                            return
                        }

                        src = fileInfo.src
                        rawData = fileInfo.data.raw
                        rect = fileInfo.data.rect
                        width = fileInfo.data.width
                        height = fileInfo.data.height
                    }

                    const valSize = rawData.length
                    const oldFile = filePathMap[src]
                    const config = this.appData.config.data

                    let targetName = src
                    if (oldFile && config.sameName !== 0) {
                        const fileNameData = src.match(/(.*)(\..*)/) || [src, src, '']
                        const idx = assetManager.getObjectInfoIndex(objectInfo)
                        targetName = `${fileNameData[1]}_${idx}${fileNameData[2]}`
                    }

                    const shouldSave = !oldFile || config.sameName !== 0 || valSize > oldFile.size

                    if (shouldSave) {
                        const options = {
                            directoryHandle: this.appData.webDirectoryHandle,
                            lastSavedDirectory:
                                this.appData.config.data.lastSavedDirectory ||
                                this.appData.config.data.lastDefaultSavedDirectory,
                            zipInstance: zip,
                        }
                        await platform.saveFile(targetName, rawData, options)
                        filePathMap[src] = { size: valSize }

                        if (!isRawMode && object.className === 'Sprite' && config.exportSpritePositionJson) {
                            const jsonStr = JSON.stringify({ rect, width, height }, null, 2)
                            await platform.saveFile(`${targetName}.json`, jsonStr, options)
                        }
                    }
                } catch (err) {
                    logRef.add(`❌ Failed to export ${object.name}: ${err.message}`, 'error')
                }
            })
        })

        await executor.execute()

        // Package ZIP in browser mode without directorypicker
        if (platform.isWebBrowser && !this.appData.webDirectoryHandle) {
            logRef.add(this.i18nStore.t('exportZipProgress'), 'stage')
            const content = await zip.generateAsync({ type: 'blob' })
            platform.downloadBlob(content, `export_${Date.now()}.zip`)
        }
    }

    /**
     * Bulk export Live2D models
     * @param {Array<Object>} exportObjects CubismModels/MonoBehaviours to export
     * @param {Function} progressCallback callback (completedCount, totalCount)
     * @param {Object} logRef Log handler { add: (text, type) => void }
     */
    async exportLive2D(exportObjects, progressCallback, logRef) {
        if (
            !platform.isWebBrowser &&
            !this.appData.config.data.lastSavedDirectory &&
            !this.appData.config.data.lastDefaultSavedDirectory
        ) {
            throw new Error('请先选择导出文件夹')
        }

        const zip = new JSZip()

        const executor = new ExportTaskExecutor({
            maxConcurrency: this.appData.config.data.maxTask,
        })

        if (progressCallback) {
            executor.onProgress = progressCallback
        }

        exportObjects.forEach((object, index) => {
            executor.addTask(async () => {
                logRef.add(`Exporting Live2D (${index + 1}/${exportObjects.length}): ${object.name}`)
                try {
                    const assetManager = await UnityFSGui.assetManagers.get(object.assetManagerId)
                    const objectInfos = assetManager.getObjectInfos()
                    const objectInfo = objectInfos[object.objectId]

                    if (!objectInfo) throw new Error('未找到资源对象')

                    const filePath = assetManager.getObjectPathInfo(objectInfo)
                    if (!filePath) throw new Error('无法构建虚拟路径')

                    let exportConfig = { type: 'arrayBuffer', worker: true }
                    const fileInfo = await assetManager.exportFile(objectInfo, exportConfig)

                    if (fileInfo && fileInfo.isFolder) {
                        const folderPath = filePath.path ? `${filePath.path}/${fileInfo.name}` : fileInfo.name
                        const options = {
                            directoryHandle: this.appData.webDirectoryHandle,
                            lastSavedDirectory:
                                this.appData.config.data.lastSavedDirectory ||
                                this.appData.config.data.lastDefaultSavedDirectory,
                            zipInstance: zip,
                        }
                        for (const [subPath, subData] of Object.entries(fileInfo.files)) {
                            const fullSubPath = `${folderPath}/${subPath}`
                            await platform.saveFile(fullSubPath, subData, options)
                        }
                        logRef.add(`√ 导出成功: ${fileInfo.name}`)
                    } else {
                        logRef.add(`❌ 导出失败 (未返回文件夹结构): ${object.name}`, 'error')
                    }
                } catch (err) {
                    logRef.add(`❌ 导出失败: ${object.name} (${err.message})`, 'error')
                }
            })
        })

        await executor.execute()

        // Package ZIP in browser mode without directorypicker
        if (platform.isWebBrowser && !this.appData.webDirectoryHandle) {
            logRef.add(this.i18nStore.t('exportZipProgress'), 'stage')
            const content = await zip.generateAsync({ type: 'blob' })
            platform.downloadBlob(content, `live2d_export_${Date.now()}.zip`)
        }
    }
}

export const ExportService = new ExportServiceClass()
