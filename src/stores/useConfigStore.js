import { defineStore } from 'pinia'
import { reactive, watch } from 'vue'
import { UnityFSGui } from '@/services/unity/UnityFSGuiService'
import { safeLocalStorage } from '@/utils/storage/StorageManager'

export const useConfigStore = defineStore('config', () => {
    const data = reactive({
        version: 20260121,
        exportScope: 0,
        loadMode: 0,
        maxTask: 4,
        maxCache: 5,
        sameName: 0,
        spriteCutting: false,
        exportSpritePositionJson: false,
        lastSavedDirectory: '',
        userDownloadPath: '',
        userOpenFile: [],
        lastDefaultSavedDirectory: '',
        unityRevision: '',
        sliceBeforeSecondUnityFS: false,
        autoRestoreLastFile: false,
        importHistory: [],
        exportMode: 'standard',
        pngEncoder: 'auto',
    })

    function loadConfig() {
        let loaded = null
        try {
            const rawConfig = safeLocalStorage.getItem('unityfs-gui-config')
            if (rawConfig) {
                loaded = JSON.parse(rawConfig)
            }
        } catch {
            // Ignore syntax error from parsing config
        }

        if (loaded) {
            Object.keys(data).forEach((key) => {
                if (key in loaded) {
                    data[key] = loaded[key]
                }
            })
        }
        data.version = 20260121
        syncToEngine()
    }

    function saveConfig() {
        safeLocalStorage.setItem('unityfs-gui-config', JSON.stringify(data))
    }

    function syncToEngine() {
        UnityFSGui.assetManagers.loadMode = data.loadMode
        UnityFSGui.assetManagers.maxCache = data.maxCache
        UnityFSGui.assetManagers.unityRevision = data.unityRevision
        UnityFSGui.assetManagers.sliceBeforeSecondUnityFS = data.sliceBeforeSecondUnityFS
    }

    // Auto-load config upon store instantiation
    loadConfig()

    // Auto-save & sync config when any property of data changes
    watch(
        data,
        () => {
            saveConfig()
            syncToEngine()
        },
        { deep: true },
    )

    return {
        data,
        loadConfig,
        saveConfig,
        syncToEngine,
    }
})
