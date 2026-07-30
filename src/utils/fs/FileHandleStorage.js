import { safeIndexedDB } from '@/utils/storage/StorageManager'

const STORE_NAME = 'file_handles'
const HANDLE_KEY = 'last_dir_handle'

export const FileHandleStorage = {
    /**
     * Save FileSystemDirectoryHandle to IndexedDB
     * @param {FileSystemDirectoryHandle} handle
     * @returns {Promise<void>}
     */
    async saveDirectoryHandle(handle) {
        return safeIndexedDB.setItem(STORE_NAME, HANDLE_KEY, handle)
    },

    /**
     * Get saved FileSystemDirectoryHandle from IndexedDB
     * @returns {Promise<FileSystemDirectoryHandle|null>}
     */
    async getSavedDirectoryHandle() {
        return safeIndexedDB.getItem(STORE_NAME, HANDLE_KEY)
    },

    /**
     * Clear saved FileSystemDirectoryHandle
     * @returns {Promise<void>}
     */
    async clearDirectoryHandle() {
        return safeIndexedDB.removeItem(STORE_NAME, HANDLE_KEY)
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
