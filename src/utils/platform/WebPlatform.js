import { PlatformAdapter } from './PlatformAdapter'
import JSZip from 'jszip'

export class WebPlatform extends PlatformAdapter {
    get isWebBrowser() {
        return true
    }
    get name() {
        return 'Web'
    }

    async selectFilesOrFolder(options = { type: 'file' }) {
        return new Promise((resolve) => {
            const input = document.createElement('input')
            input.type = 'file'
            if (options.type === 'folder') {
                input.setAttribute('webkitdirectory', '')
            } else {
                input.multiple = true
            }
            input.onchange = (e) => {
                const files = e.target.files
                const results = []
                if (!files || files.length === 0) {
                    resolve([])
                    return
                }
                if (options.type === 'file') {
                    for (let i = 0; i < files.length; i++) {
                        results.push({
                            path: files[i].name,
                            type: 'file',
                            raw: files[i],
                        })
                    }
                } else {
                    const folderName = files[0].webkitRelativePath.split('/')[0]
                    results.push({
                        path: folderName,
                        type: 'folder',
                        raw: files,
                    })
                }
                resolve(results)
            }
            // If user cancels dialog, input elements in DOM are clean anyway.
            input.click()
        })
    }

    async selectDirectory() {
        if (!window.showDirectoryPicker) {
            throw new Error('FileSystem Access API is not supported in this browser')
        }
        return await window.showDirectoryPicker({ mode: 'readwrite' })
    }

    async saveFile(cleanPath, data, options = {}) {
        if (options.directoryHandle) {
            const pathParts = cleanPath.replace(/\\/g, '/').replace(/^\//, '').split('/')
            const fileName = pathParts.pop()
            let currentDirHandle = options.directoryHandle

            for (const part of pathParts) {
                if (part) {
                    currentDirHandle = await currentDirHandle.getDirectoryHandle(part, { create: true })
                }
            }

            const fileHandle = await currentDirHandle.getFileHandle(fileName, { create: true })
            const writable = await fileHandle.createWritable()
            await writable.write(data)
            await writable.close()
        } else if (options.zipInstance) {
            const normPath = cleanPath.replace(/\\/g, '/').replace(/^\//, '')
            options.zipInstance.file(normPath, data)
        } else {
            const blob = data instanceof Blob ? data : new Blob([data])
            this.downloadBlob(blob, cleanPath.split('/').pop())
        }
    }

    async saveFolder(folderName, filesMap, options = {}) {
        if (options.directoryHandle) {
            for (const [subPath, subData] of Object.entries(filesMap)) {
                await this.saveFile(`${folderName}/${subPath}`, subData, options)
            }
        } else {
            const zip = new JSZip()
            for (const [subPath, subData] of Object.entries(filesMap)) {
                const normSubPath = subPath.replace(/\\/g, '/').replace(/^\//, '')
                zip.file(normSubPath, subData)
            }
            const content = await zip.generateAsync({ type: 'blob' })
            this.downloadBlob(content, `${folderName}.zip`)
        }
    }

    downloadBlob(blob, name) {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }
}
