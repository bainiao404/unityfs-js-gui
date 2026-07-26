import { GKD } from '@/assets/gkd-js-0.2/index'

export const PlatformFS = {
    isWebBrowser: typeof window !== 'undefined' && !window.__dirname && !window.cordova,
    isElectron: typeof window !== 'undefined' && !!window.__dirname,
    isCordova: typeof window !== 'undefined' && !!window.cordova,

    /**
     * Check if a file or directory exists (native only)
     * @param {string} path
     * @returns {Promise<{state: boolean}>}
     */
    async exists(path) {
        if (this.isWebBrowser) {
            return { state: false }
        }
        return await GKD.fs.exists(path)
    },

    /**
     * Read directory recursively (native only)
     * @param {string} path
     * @returns {Promise<string[]>}
     */
    async readdirAllFile(path) {
        if (this.isWebBrowser) {
            return []
        }
        return await GKD.fs.readdirAllFile(path)
    },

    /**
     * Save a file to the native filesystem
     * @param {string} path
     * @param {Uint8Array|string|Blob} data
     * @returns {Promise<any>}
     */
    async saveFile(path, data) {
        if (this.isWebBrowser) {
            throw new Error('Native file system saveFile is not supported in browser mode')
        }
        return await GKD.fs.saveFile(path, data)
    },

    /**
     * Fetch binary data (compatible with local paths via XHR and HTTP urls)
     * @param {string} url
     * @returns {Promise<ArrayBuffer|null>}
     */
    fetchBinaryFile(url) {
        return new Promise((resolve) => {
            const xhr = new XMLHttpRequest()
            xhr.open('GET', url, true)
            xhr.responseType = 'arraybuffer'
            xhr.onload = () => {
                if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 0) {
                    resolve(xhr.response)
                } else {
                    resolve(null)
                }
            }
            xhr.onerror = () => resolve(null)
            xhr.send()
        })
    },
}
