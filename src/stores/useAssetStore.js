import { defineStore } from 'pinia'
import { ref, reactive, markRaw } from 'vue'
import { UnityFSGui } from '@/services/unity/UnityFSGuiService'

export const useAssetStore = defineStore('asset', () => {
    // 1. Asset manager UI update trigger
    const assetManagerUI = reactive({
        upTime: null,
        up() {
            this.upTime = Date.now()
            // Automatically trigger indexing when files change
            updateViewData()
        },
    })

    // 2. Object List UI states
    const objectUI = reactive({
        list: [],
        currentList: [],
        selectedViewIds: [],
        isImporting: false,
        importCount: 0,
    })

    const loadPercentage = ref(-1)
    const objectTypes = ref([])

    // 3. Spine components view state
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

    // 4. Directory Picker State for Web Platform (not saved to JSON)
    const webDirectoryHandle = ref(null)
    const hasWebPermission = ref(false)

    // Action to load and index all asset managers
    async function updateViewData() {
        loadPercentage.value = 0
        const list = []
        const typeSet = new Set()
        const count = UnityFSGui.assetManagers.list.length

        for (let managerIndex = 0; managerIndex < count; managerIndex++) {
            loadPercentage.value = count > 0 ? managerIndex / count : 0

            let assetManager = await UnityFSGui.assetManagers.get(managerIndex)
            if (!assetManager) continue

            // Build MonoScripts map for fast MonoBehaviour script resolution
            const monoScriptsMap = new Map()
            try {
                const monoScriptInfos = assetManager.getObjectInfosByClass('MonoScript')
                for (const info of monoScriptInfos) {
                    monoScriptsMap.set(info.pathID, info)
                }
            } catch (e) {
                console.warn('Failed to pre-index MonoScripts', e)
            }

            const classFiles = assetManager.getObjectInfos()
            classFiles.forEach((element, objectIndex) => {
                let className = element.getClassName()
                const path = assetManager.getObjectPathInfo(element)

                if (className === 'MonoBehaviour') {
                    try {
                        let isCubism = false
                        const mono = element.object
                        if (mono && mono.script) {
                            const scriptPathID = mono.script.pathID
                            if (scriptPathID) {
                                const scriptObjInfo = monoScriptsMap.get(scriptPathID)
                                if (scriptObjInfo && scriptObjInfo.object) {
                                    if (scriptObjInfo.object.className === 'CubismModel') {
                                        isCubism = true
                                    }
                                }
                            }
                        }

                        if (!isCubism) {
                            const monoData = element.assetFile?.getObjectUsingTreeJSON(element)
                            if (monoData && (monoData._moc !== undefined || monoData.m_Moc !== undefined)) {
                                isCubism = true
                            }
                        }

                        if (isCubism) {
                            className = 'CubismModel'
                        }
                    } catch (e) {
                        // ignore
                    }
                }

                typeSet.add(className)

                list.push({
                    assetManagerId: managerIndex,
                    objectId: objectIndex,
                    pathID: String(element.pathID),
                    name: element.name,
                    className,
                    size: element.size,
                    exportExtension: element.exportExtension || 'null',
                    path: path ? path.path : '',
                    viewId: managerIndex + '-' + objectIndex,
                    selected: false,
                })
            })
        }

        objectTypes.value = Array.from(typeSet).map((type) => ({
            label: type,
            value: type,
        }))

        objectUI.list = markRaw(list)
        loadPercentage.value = -1
    }

    return {
        assetManagerUI,
        objectUI,
        loadPercentage,
        objectTypes,
        spineView,
        webDirectoryHandle,
        hasWebPermission,
        updateViewData,
    }
})
