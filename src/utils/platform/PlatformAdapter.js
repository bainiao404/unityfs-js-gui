export class PlatformAdapter {
    get isElectron() {
        return false
    }
    get isCordova() {
        return false
    }
    get isWebBrowser() {
        return false
    }
    get name() {
        return 'Unknown'
    }

    /**
     * 打开文件/文件夹选择器，返回选中的文件列表 [{ path, type, raw? }]
     * @param {Object} [options] 选项
     * @param {string} [options.type] 'file' | 'folder'
     * @returns {Promise<Array<{path: string, type: string, raw?: File|FileList}>>}
     */
    async selectFilesOrFolder(options = { type: 'file' }) {
        throw new Error('selectFilesOrFolder not implemented')
    }

    /**
     * 选择导出目录，Web 端返回 DirectoryHandle，原生端返回路径字符串
     * @returns {Promise<any>}
     */
    async selectDirectory() {
        throw new Error('selectDirectory not implemented')
    }

    /**
     * 保存单个文件
     * @param {string} cleanPath 文件虚拟路径/文件名
     * @param {Uint8Array|string|Blob} data 数据
     * @param {Object} [options] 配置，如 directoryHandle, lastSavedDirectory
     */
    async saveFile(cleanPath, data, options = {}) {
        throw new Error('saveFile not implemented')
    }

    /**
     * 保存目录下的所有文件 (Web打包为zip，原生端写入物理文件夹)
     * @param {string} folderName 目录名
     * @param {Object} filesMap 键为相对路径，值为数据
     * @param {Object} [options] 配置，如 directoryHandle, lastSavedDirectory
     */
    async saveFolder(folderName, filesMap, options = {}) {
        throw new Error('saveFolder not implemented')
    }

    /**
     * 在系统资源管理器中定位/打开目录
     * @param {string} filePath
     */
    openInExplorer(filePath) {
        // NOP on non-desktop platforms
    }
}
