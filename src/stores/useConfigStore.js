import { defineStore } from 'pinia'
import { reactive, watch } from 'vue'
import { UnityFSGui } from '@/services/unity/UnityFSGuiService'

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
    })

    function loadConfig() {
        let loaded = null
        try {
            loaded = JSON.parse(localStorage.getItem('unityfs-gui-config'))
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
        try {
            localStorage.setItem('unityfs-gui-config', JSON.stringify(data))
        } catch (err) {
            console.warn('localStorage setItem failed:', err)
        }
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
