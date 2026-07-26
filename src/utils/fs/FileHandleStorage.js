const DB_NAME = 'UintyJsGuiDB'
const STORE_NAME = 'file_handles'
const HANDLE_KEY = 'last_dir_handle'

function openDB() {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error('IndexedDB is not supported'))
            return
        }
        const request = indexedDB.open(DB_NAME, 1)
        request.onupgradeneeded = (e) => e.target.result.createObjectStore(STORE_NAME)
        request.onsuccess = (e) => resolve(e.target.result)
        request.onerror = (e) => reject(e)
    })
}

export const FileHandleStorage = {
    /**
     * Save FileSystemDirectoryHandle to IndexedDB
     * @param {FileSystemDirectoryHandle} handle
     * @returns {Promise<void>}
     */
    async saveDirectoryHandle(handle) {
        const db = await openDB()
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite')
            const store = transaction.objectStore(STORE_NAME)
            const request = store.put(handle, HANDLE_KEY)
            request.onsuccess = () => resolve()
            request.onerror = (e) => reject(e)
        })
    },

    /**
     * Get saved FileSystemDirectoryHandle from IndexedDB
     * @returns {Promise<FileSystemDirectoryHandle|null>}
     */
    async getSavedDirectoryHandle() {
        try {
            const db = await openDB()
            return new Promise((resolve) => {
                const transaction = db.transaction(STORE_NAME, 'readonly')
                const store = transaction.objectStore(STORE_NAME)
                const request = store.get(HANDLE_KEY)
                request.onsuccess = () => resolve(request.result || null)
                request.onerror = () => resolve(null)
            })
        } catch (err) {
            console.warn('Failed to retrieve directory handle from IndexedDB:', err)
            return null
        }
    },

    /**
     * Clear saved FileSystemDirectoryHandle
     * @returns {Promise<void>}
     */
    async clearDirectoryHandle() {
        try {
            const db = await openDB()
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STORE_NAME, 'readwrite')
                const store = transaction.objectStore(STORE_NAME)
                const request = store.delete(HANDLE_KEY)
                request.onsuccess = () => resolve()
                request.onerror = (e) => reject(e)
            })
        } catch (err) {
            console.warn('Failed to clear directory handle from IndexedDB:', err)
        }
    },

    /**
     * Verify or request permissions for a FileSystemDirectoryHandle
     * @param {FileSystemDirectoryHandle} handle
     * @param {boolean} requestIfMissing
     * @returns {Promise<boolean>}
     */
    async verifyPermission(handle, requestIfMissing = false) {
        if (!handle) return false
        const opts = { mode: 'readwrite' }

        let status = await handle.queryPermission(opts)
        if (status === 'granted') {
            return true
        }

        if (requestIfMissing) {
            status = await handle.requestPermission(opts)
            return status === 'granted'
        }

        return false
    },
}
