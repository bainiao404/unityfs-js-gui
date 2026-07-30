/**
 * StorageManager - 统一存储管理模块
 * 负责提供安全的 LocalStorage 与 Promise 封装的 IndexedDB 读写接口
 */

class MemoryStorage {
    constructor() {
        this.store = {}
    }

    getItem(key) {
        return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null
    }

    setItem(key, value) {
        this.store[key] = String(value)
    }

    removeItem(key) {
        delete this.store[key]
    }

    clear() {
        this.store = {}
    }
}

class LocalStorageWrapper {
    constructor() {
        this.inMemory = false
        this.fallbackStore = null

        // 检查 LocalStorage 可用性
        try {
            const testKey = '__storage_test__'
            window.localStorage.setItem(testKey, testKey)
            window.localStorage.removeItem(testKey)
        } catch (e) {
            console.warn('localStorage is not available, falling back to memory storage:', e)
            this.inMemory = true
            this.fallbackStore = new MemoryStorage()
        }
    }

    getItem(key) {
        if (this.inMemory) {
            return this.fallbackStore.getItem(key)
        }
        try {
            return window.localStorage.getItem(key)
        } catch (e) {
            console.warn(`localStorage.getItem failed for key "${key}":`, e)
            return null
        }
    }

    setItem(key, value) {
        if (this.inMemory) {
            this.fallbackStore.setItem(key, value)
            return
        }
        try {
            window.localStorage.setItem(key, value)
        } catch (e) {
            console.warn(`localStorage.setItem failed for key "${key}":`, e)
        }
    }

    removeItem(key) {
        if (this.inMemory) {
            this.fallbackStore.removeItem(key)
            return
        }
        try {
            window.localStorage.removeItem(key)
        } catch (e) {
            console.warn(`localStorage.removeItem failed for key "${key}":`, e)
        }
    }

    clear() {
        if (this.inMemory) {
            this.fallbackStore.clear()
            return
        }
        try {
            window.localStorage.clear()
        } catch (e) {
            console.warn('localStorage.clear failed:', e)
        }
    }
}

class IndexedDbWrapper {
    constructor(dbName = 'UintyJsGuiDB', dbVersion = 1, storeNames = ['file_handles']) {
        this.dbName = dbName
        this.dbVersion = dbVersion
        this.storeNames = storeNames
    }

    openDB() {
        return new Promise((resolve, reject) => {
            if (typeof indexedDB === 'undefined') {
                reject(new Error('IndexedDB is not supported'))
                return
            }
            const request = indexedDB.open(this.dbName, this.dbVersion)
            request.onupgradeneeded = (e) => {
                const db = e.target.result
                this.storeNames.forEach((storeName) => {
                    if (!db.objectStoreNames.contains(storeName)) {
                        db.createObjectStore(storeName)
                    }
                })
            }
            request.onsuccess = (e) => resolve(e.target.result)
            request.onerror = (e) => reject(e.target.error)
        })
    }

    async getItem(storeName, key) {
        try {
            const db = await this.openDB()
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(storeName, 'readonly')
                const store = transaction.objectStore(storeName)
                const request = store.get(key)
                request.onsuccess = () => resolve(request.result || null)
                request.onerror = (e) => reject(e.target.error)
            })
        } catch (err) {
            console.warn(`IndexedDB.getItem failed for store "${storeName}", key "${key}":`, err)
            return null
        }
    }

    async setItem(storeName, key, value) {
        try {
            const db = await this.openDB()
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(storeName, 'readwrite')
                const store = transaction.objectStore(storeName)
                const request = store.put(value, key)
                request.onsuccess = () => resolve()
                request.onerror = (e) => reject(e.target.error)
            })
        } catch (err) {
            console.error(`IndexedDB.setItem failed for store "${storeName}", key "${key}":`, err)
            throw err
        }
    }

    async removeItem(storeName, key) {
        try {
            const db = await this.openDB()
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(storeName, 'readwrite')
                const store = transaction.objectStore(storeName)
                const request = store.delete(key)
                request.onsuccess = () => resolve()
                request.onerror = (e) => reject(e.target.error)
            })
        } catch (err) {
            console.error(`IndexedDB.removeItem failed for store "${storeName}", key "${key}":`, err)
            throw err
        }
    }

    async clearStore(storeName) {
        try {
            const db = await this.openDB()
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(storeName, 'readwrite')
                const store = transaction.objectStore(storeName)
                const request = store.clear()
                request.onsuccess = () => resolve()
                request.onerror = (e) => reject(e.target.error)
            })
        } catch (err) {
            console.error(`IndexedDB.clearStore failed for store "${storeName}":`, err)
            throw err
        }
    }
}

// 导出统一管理实例
export const safeLocalStorage = new LocalStorageWrapper()
export const safeIndexedDB = new IndexedDbWrapper()
