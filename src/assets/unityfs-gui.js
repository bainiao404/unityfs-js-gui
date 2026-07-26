import { GKD } from './gkd-js-0.2/index'
import { load } from './unityfs-js/index'
import { AppData } from '../stores/counter'
export const UnityFSGui = {
    webFileCache: new Map(),
    assetManagers: {
        loadMode: 0,
        list: [],
        cache: [],
        maxCache: 5,
        add: function (assetManager) {
            this.list.push(assetManager)
        },
        clear: function () {
            // 释放所有已加载的资源管理器内存引用
            for (const item of this.list) {
                if (item && item.data && typeof item.data.dispose === 'function') {
                    item.data.dispose()
                    delete item.data
                }
            }
            for (const item of this.cache) {
                if (item && item.data && typeof item.data.dispose === 'function') {
                    item.data.dispose()
                    delete item.data
                }
            }
            this.cache.length = 0
            this.list.length = 0
        },
        /**
         * 获取并加载资源
         */
        get: async function (assetManagerId) {
            let assetManager = this.list[assetManagerId]

            // 如果已经加载过数据，直接返回
            if (assetManager.data) {
                return assetManager.data
            }

            // 确定加载源 (处理 Browser / Electron / Cordova 差异)
            let loadSource

            if (assetManager.file instanceof File) {
                // --- 浏览器端逻辑 ---
                // 如果是原生 File 对象，转换为 ArrayBuffer
                loadSource = await assetManager.file.arrayBuffer()
            } else {
                // --- 桌面端/移动端逻辑 ---
                // 使用已经存在的 arrayBuffer 或者 物理路径 path
                loadSource = assetManager.arrayBuffer || assetManager.path
            }

            // 调用 UnityJs 加载引擎
            let manager = null
            try {
                // 获取用户设置的Unity版本
                let appData = AppData()
                let loadOptions = {}
                if (appData.config.data.unityRevision) {
                    loadOptions.unityRevision = appData.config.data.unityRevision
                }

                // 获取用户设置 of sliceBeforeSecondUnityFS 选项
                if (appData.config.data.sliceBeforeSecondUnityFS) {
                    loadOptions.sliceBeforeSecondUnityFS = appData.config.data.sliceBeforeSecondUnityFS
                }

                // 根据是否有版本参数决定调用方式
                if (Object.keys(loadOptions).length > 0) {
                    manager = await load(loadSource, loadOptions)
                } else {
                    manager = await load(loadSource)
                }
            } catch (err) {
                console.log(err)
                let log = typeof loadSource == 'string' ? loadSource : 'assetManagerId:' + assetManagerId
                UnityFSGui.log.add('打开[' + log + ']时出现错误')
                return null
            }


            if (!manager) return null

            // === 关键修复：为原始 .assets 文件自动加载伴生资源文件 ===
            // 原始 .assets 文件中的流式纹理(Texture2D)和音频(AudioClip)
            // 数据存储在同目录下的 .resS 或 .resource 伴生文件中。
            // 必须将这些文件注册到 AssetManager 后 resolveResource() 才能正常工作。
            if (typeof loadSource === 'string' && loadSource.includes('.')) {
                await _loadCompanionResources(loadSource, manager)
            }

            // 提取并保存资源元数据
            let assetFile = manager.primaryAssetFile
            let name = ''
            if (assetManager.file) {
                name = assetManager.file.name
            } else if (assetManager.path) {
                name = assetManager.path.split('/').pop()
            }
            assetManager.info = {
                name: name,
                path: assetManager.path || '',
                targetPlatform: assetFile?.targetPlatform,
                unityRevision: assetFile?.unityRevision,
                version: assetFile?.version,
                fileSize: assetFile?.fileSize,
                endianness: assetFile?.endianness,
            }

            // 根据加载模式处理缓存
            if (this.loadMode == 0) {
                // 永久驻留模式
                assetManager.data = manager
            } else if (this.loadMode == 1) {
                // 限制缓存模式
                if (this.cache.length >= this.maxCache) {
                    let oldAssetManager = this.cache.shift()
                    // 释放旧数据的内存引用
                    if (oldAssetManager.data && typeof oldAssetManager.data.dispose === 'function') {
                        oldAssetManager.data.dispose()
                    }
                    delete oldAssetManager.data
                }
                if (!this.cache.includes(assetManager)) {
                    assetManager.data = manager
                    this.cache.push(assetManager)
                }
            }

            return manager
        },
    },
    downloadManager: (() => {
        let data = GKD.downloadFile.addTasks()
        let downloadManager = {
            list: {},
            endList: {},
            progress: null,
            _progress: function (e) {
                let t = this
                e.list.forEach((e) => {
                    if (e.state == 0 || e.state == 1 || e.state == 2) {
                        t.list[e.id] = e
                    } else {
                        if (t.list[e.id]) delete t.list[e.id]
                        t.endList[e.id] = { file: e.file, http: e.http, state: e.state, name: e.name }
                    }
                })
                if (this.progress) this.progress(e)
            },
            data: data,
            add: function (list) {
                let t = this
                return data.add(list, (e) => {
                    t._progress(e)
                })
            },
        }
        return downloadManager
    })(),
    log: {
        list: [],
        add: function (txt, type = 'default') {
            this.list.push({ text: txt, type: type })
        },
    },
    openFiles: async function (files, progressCallback) {
        this.assetManagers.clear()

        const isWeb = typeof window !== 'undefined' && !window.__dirname && !window.cordova
        let finalFiles = []

        for (const item of files) {
            if (isWeb) {
                if (item.type === 'file') {
                    if (item.raw) {
                        finalFiles.push({ path: item.path, file: item.raw })
                    }
                } else if (item.type === 'folder') {
                    if (item.raw) {
                        const filesList = Array.from(item.raw)
                        filesList.forEach((f) => {
                            finalFiles.push({ path: f.webkitRelativePath || f.name, file: f })
                        })
                    }
                }
            } else {
                if (item.type === 'file') {
                    finalFiles.push({ path: item.path.replace(/\\/g, '/') })
                } else if (item.type === 'folder') {
                    try {
                        const subPaths = await GKD.fs.readdirAllFile(item.path)
                        subPaths.forEach((sp) => {
                            finalFiles.push({ path: sp.replace(/\\/g, '/') })
                        })
                    } catch (err) {
                        console.error('读取文件夹失败:', item.path, err)
                        finalFiles.push({ path: item.path.replace(/\\/g, '/') })
                    }
                }
            }
        }

        if (isWeb && finalFiles.length === 0) {
            throw new Error('没有可用的文件引用，可能是页面刷新导致会话丢失，请重新选择文件。')
        }

        finalFiles.forEach((item, index) => {
            this.assetManagers.add({
                path: item.path,
                file: item.file || null,
            })
            if (progressCallback) {
                progressCallback(index + 1)
            }
        })
    },
    downloadFiles: async function (urls) {
        const tasks = urls.map((url) => {
            const filename = url.split('/').pop().split('?')[0] || 'downloaded_file'
            return {
                file: filename,
                http: url,
            }
        })
        return this.downloadManager.add(tasks)
    },
}

/**
 * 为原始 .assets 文件自动加载伴生资源文件（.resS / .resource）
 *
 * 背景说明：Unity 原始 .assets 文件中，Texture2D 和 AudioClip 等大型资源
 * 通常以流式方式存储在独立的伴生文件（同名+.resS 或 .resource 后缀）中，
 * .assets 文件本身只保存偏移量和大小。必须读取这些伴生文件并注册到 AssetManager，
 * resolveResource() 才能正确提取子资源数据用于预览和导出。
 *
 * @param {string} assetsPath 原始 .assets 文件路径（必须是本地路径字符串）
 * @param {Object} manager    已解析的 AssetManager 实例
 */
async function _loadCompanionResources(assetsPath, manager) {
    // 只对 .assets 文件处理
    if (!assetsPath.toLowerCase().endsWith('.assets')) return

    // 候选伴生文件路径列表（Unity 可能使用以下任一命名规则）
    const candidates = [assetsPath + '.resS', assetsPath + '.resource']

    const isWeb = typeof window !== 'undefined' && !window.__dirname && !window.cordova

    for (const candidatePath of candidates) {
        try {
            // 在非 Web 浏览器（如 Electron、Cordova）环境下，先通过文件系统检查文件是否存在
            // 避免 XHR 找不到文件时在控制台抛出 net::ERR_FILE_NOT_FOUND 的红字错误
            if (!isWeb) {
                const check = await GKD.fs.exists(candidatePath)
                if (!check.state) {
                    continue
                }
            }

            const data = await _fetchBinaryFile(candidatePath)
            if (data && data.byteLength > 0) {
                // 用文件名作 key 注册，resolveResource 按文件名模糊匹配
                const fileName = candidatePath.replace(/\\/g, '/').split('/').pop()
                manager.registerResourceFile(fileName, new Uint8Array(data))
                console.log(
                    `[UnityFSGui] 已加载伴生资源文件: ${fileName} (${(data.byteLength / 1024 / 1024).toFixed(2)} MB)`,
                )
            }
        } catch (e) {
            // 伴生文件不存在属于正常情况，静默忽略
        }
    }
}

/**
 * 通用二进制文件读取（兼容 file:// 本地路径和 http:// 远程路径）
 * @param {string} url 文件路径或 URL
 * @returns {Promise<ArrayBuffer|null>}
 */
function _fetchBinaryFile(url) {
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
}
