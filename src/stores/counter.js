import { ref, computed, readonly, watch, reactive } from 'vue'
import { defineStore } from 'pinia'
import { useLayerStore } from '@/layer-system/layerStore'
export const useCounterStore = defineStore('counter', () => {
    const count = ref(0)
    const doubleCount = computed(() => count.value * 2)
    function increment() {
        count.value++
    }

    return { count, doubleCount, increment }
})

export const AppData = defineStore('appData', () => {
    const layersStore = useLayerStore()

    // 1. layers helper object
    const layers = computed(() => ({
        viewState: false,
        get activeComponents() {
            return layersStore.layers.map((l) => ({
                id: l.id,
                name: l.name,
                props: l.props,
                zIndex: l.z,
                visible: l.visible,
            }))
        },
        activeComponentsData: {
            push() {},
            findIndex() {
                return -1
            },
            splice() {},
            length: 0,
        },
        permanent: {
            get spineView() {
                return layersStore.layers.some((l) => l.name === 'SpineView' && l.visible)
            },
            set spineView(val) {
                if (val) {
                    layersStore.add({
                        name: 'SpineView',
                        direction: 'bottom-to-top',
                        singleton: true,
                    })
                } else {
                    const spineLayer = layersStore.layers.find((l) => l.name === 'SpineView')
                    if (spineLayer) {
                        layersStore.remove(spineLayer.id)
                    }
                }
            },
        },
        addComponent(payload) {
            let name = ''
            let props = {}
            let direction = 'right-to-left'
            let singleton = false

            if (typeof payload === 'string') {
                name = payload
            } else {
                name = payload.name
                props = payload.props || {}
                if (payload.noAnimation) {
                    direction = 'fade'
                } else if (payload.animationPath === 'bottom') {
                    direction = 'bottom-to-top'
                }
            }

            const layer = layersStore.add({
                name,
                props,
                direction,
                singleton,
            })
            return layer.id
        },
        removeComponent(id) {
            layersStore.remove(id)
        },
        backRemoveComponent() {
            layersStore.back()
        },
    }))

    // 2. assetManagerUI
    const assetManagerUI = reactive({
        upTime: null,
        up() {
            this.upTime = Date.now()
        },
    })

    // 3. objectUI
    const objectUI = reactive({
        list: [],
        currentList: [],
        selectedViewIds: [],
        isImporting: false,
        importCount: 0,
    })

    // 4. config (formerly confi)
    const config = reactive({
        data: {
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
        },
    })

    // Load config from localStorage
    function loadConfig() {
        let loaded = null
        try {
            loaded = JSON.parse(localStorage.getItem('unityfs-gui-config'))
        } catch (err) {}

        if (loaded) {
            Object.keys(config.data).forEach((key) => {
                if (key in loaded) {
                    config.data[key] = loaded[key]
                }
            })
        }
        config.data.version = 20260121
    }

    // Save config to localStorage
    function saveConfig() {
        localStorage.setItem('unityfs-gui-config', JSON.stringify(config.data))
    }

    // 5. spineView
    const spineView = reactive({
        list: [],
        add(spinePlaces) {
            if (this.list.findIndex((e) => e[0] == spinePlaces[0] && e[1] == spinePlaces[1]) != -1) return
            this.list.push(spinePlaces)
        },
        del(spinePlaces) {
            const index = this.list.findIndex((e) => e[0] == spinePlaces[0] && e[1] == spinePlaces[1])
            if (index !== -1) {
                this.list.splice(index, 1)
            }
        },
    })

    // 6. Directory Picker State for Web Platform (not saved to JSON)
    const webDirectoryHandle = ref(null)
    const hasWebPermission = ref(false)

    // Auto-load config upon store instantiation
    loadConfig()

    // Auto-save config when any property of config.data changes
    watch(
        () => config.data,
        () => {
            saveConfig()
        },
        { deep: true },
    )

    return {
        layers,
        assetManagerUI,
        objectUI,
        config,
        spineView,
        webDirectoryHandle,
        hasWebPermission,
        loadConfig,
        saveConfig,
    }
})
