<template>
    <div
        class="spine-editor-container"
        :class="[backgroundType]"
        :style="appData.layers.permanent.spineView ? 'top:0%' : 'top:-110%'"
    >
        <SpineViewport
            ref="viewportRef"
            :spineListEmpty="spineList.length === 0"
            :isPlaying="isPlaying"
            @init="handleViewportInit"
            @close="closeSpineView"
            @toggle-play="isPlaying = !isPlaying"
            @cycle-background="cycleBackground"
            @focus-active="focusActiveSpine"
        />

        <SpineControlPanel
            v-model:isPanelCollapsed="isPanelCollapsed"
            :spineList="spineList"
            :selectedIds="selectedIds"
            :activeItemId="activeItemId"
            :activeItem="activeItem"
            :isAllSelected="isAllSelected"
            :activeItemScale="activeItemScale"
            :activeItemRotation="activeItemRotation"
            :activeItemSpeed="activeItemSpeed"
            :activeItemSkin="activeItemSkin"
            :activeItemAnim="activeItemAnim"
            :commonSkins="commonSkins"
            :commonAnims="commonAnims"
            :batchParams="batchParams"
            @toggle-all="handleToggleAll"
            @select-item="(id) => (activeItemId = id)"
            @toggle-select="toggleSelect"
            @move-layer="handleMoveLayer"
            @delete-item="deleteSpine"
            @update-active-scale="updateActiveScale"
            @update-active-rotation="updateActiveRotation"
            @update-active-speed="updateActiveSpeed"
            @update-active-skin="updateActiveSkin"
            @update-active-anim="updateActiveAnim"
            @reset-active-transforms="resetActiveTransforms"
            @batch-scale="batchScale"
            @batch-rotation="batchRotation"
            @batch-skin="applyBatchSkin"
            @batch-anim="applyBatchAnim"
            @reset-batch="resetParam"
            @focus-active="focusActiveSpine"
        />
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, watch, markRaw, shallowRef, triggerRef } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import { AppData } from '@/stores/counter'
import SimpleSpine from '@/assets/SimpleSpine-0.2/index.js'
import { UnityFSGui } from '@/assets/unityfs-gui'
import SpineViewport from './Spine/SpineViewport.vue'
import SpineControlPanel from './Spine/SpineControlPanel.vue'

const appData = AppData()

// --- Refs & Component Instances ---
const viewportRef = ref(null)
let app = null
let world = null
let selectionBox = null

// --- State Management ---
const isPanelCollapsed = ref(false)
const spineList = shallowRef([])
const selectedIds = ref(new Set())
const activeItemId = ref(null)

// --- Viewport State ---
const backgroundType = ref('checkerboard')
const backgroundTypes = ['checkerboard', 'white', 'black', 'green']
const isPlaying = ref(true)

const batchParams = reactive({
    scale: 1,
    rotation: 0,
})

// --- Computed ---
const isAllSelected = computed(() => spineList.value.length > 0 && selectedIds.value.size === spineList.value.length)
const activeItem = computed(() => spineList.value.find((s) => s.id === activeItemId.value))

const activeItemScale = computed(() => {
    const item = spineList.value.find((s) => s.id === activeItemId.value)
    return item?.currentScale ?? 1
})
const activeItemRotation = computed(() => {
    const item = spineList.value.find((s) => s.id === activeItemId.value)
    return item?.currentRotation ?? 0
})
const activeItemSpeed = computed(() => {
    const item = spineList.value.find((s) => s.id === activeItemId.value)
    return item?.currentSpeed ?? 1
})
const activeItemSkin = computed(() => {
    const item = spineList.value.find((s) => s.id === activeItemId.value)
    return item?.currentSkin ?? ''
})
const activeItemAnim = computed(() => {
    const item = spineList.value.find((s) => s.id === activeItemId.value)
    return item?.currentAnim ?? ''
})

const commonSkins = computed(() => {
    const firstSelected = spineList.value.find((s) => selectedIds.value.has(s.id))
    return firstSelected ? firstSelected.skins : []
})

const commonAnims = computed(() => {
    const firstSelected = spineList.value.find((s) => selectedIds.value.has(s.id))
    return firstSelected ? firstSelected.animations : []
})

// --- Viewport Initialization ---
function handleViewportInit({ app: newApp, world: newWorld }) {
    app = newApp
    world = newWorld

    // 选框线指示器
    selectionBox = new window.PIXI.Graphics()
    world.addChild(selectionBox)

    app.ticker.add(updateSelectionBox)

    // Start loading models
    loadSpines()
}

// 选框指示器动态更新
function updateSelectionBox() {
    if (!selectionBox || !world) return
    selectionBox.clear()
    const active = activeItem.value
    if (!active || !active.instance || !active.instance.parent) return

    try {
        const bounds = active.instance.getLocalBounds()

        // 品牌色线框
        selectionBox.lineStyle(2, 0x0052d9, 0.8)
        selectionBox.drawRect(bounds.x, bounds.y, bounds.width, bounds.height)

        // 步进对齐模型实例物理坐标及缩放
        selectionBox.x = active.instance.x
        selectionBox.y = active.instance.y
        selectionBox.scale.copyFrom(active.instance.scale)
        selectionBox.angle = active.instance.angle
    } catch (e) {
        // Safe check for destroyed nodes
    }
}

// 相机聚焦
function focusActiveSpine() {
    const active = activeItem.value
    if (!active || !active.instance || !viewportRef.value) return

    const bounds = active.instance.getLocalBounds()
    const coords = { x: active.instance.x, y: active.instance.y }

    viewportRef.value.focusOnBounds(bounds, coords)
}

function getArrayBuffer(data) {
    if (data instanceof ArrayBuffer) return data
    if (ArrayBuffer.isView(data)) {
        return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
    }
    return data
}

// 加载 Spine 模型
const loadingKeys = new Set()

async function loadSpines() {
    if (!world) return
    if (!appData.spineView?.list?.length) return

    for (const spinePlace of appData.spineView.list) {
        const spineKey = `${spinePlace[0]}_${spinePlace[1]}`
        if (spineList.value.some((item) => item.cacheKey === spineKey)) continue
        if (loadingKeys.has(spineKey)) continue

        loadingKeys.add(spineKey)

        try {
            const assetManager = await UnityFSGui.assetManagers.get(spinePlace[0])
            const object = assetManager.getObjectInfos()[spinePlace[1]]
            const fileInfo = await assetManager.exportFile(object)

            let rawData = fileInfo.data.raw
            let spineVersion = null
            try {
                const parsed = JSON.parse(rawData)
                rawData = parsed
                spineVersion = SimpleSpine.isVersion(parsed)
            } catch (err) {
                const skelArrayBuffer = await assetManager.exportFile(object, { type: 'arrayBuffer' })
                rawData = getArrayBuffer(skelArrayBuffer.data.raw)
                spineVersion = SimpleSpine.detectSpineVersion({ data: rawData, type: 'skel' })
            }

            if (!spineVersion) continue

            const spineName = object.name.replace(/\..*/, '')
            const spineAtlasData = {}

            await assetManager.forEachFile('TextAsset', async (e, exportFile) => {
                const lowerName = e.object.name.toLowerCase()
                if (lowerName.includes('.atlas') || lowerName.includes('_atlas') || lowerName.includes('atlas')) {
                    const b = await exportFile()
                    const rawName = e.object.name
                    spineAtlasData[rawName] = b.data.raw

                    const cleanName = rawName.replace(/\.atlas/gi, '').replace(/\.txt/gi, '')
                    spineAtlasData[cleanName] = b.data.raw
                }
            })

            let atlasData = spineAtlasData[spineName]
            if (!atlasData) {
                const keys = Object.keys(spineAtlasData)
                const matchedKey = keys.find((k) => k.startsWith(spineName) || spineName.startsWith(k))
                if (matchedKey) {
                    atlasData = spineAtlasData[matchedKey]
                } else if (keys.length === 1) {
                    atlasData = spineAtlasData[keys[0]]
                }
            }

            const textureTasks = []
            await assetManager.forEachFile('Texture2D', async (e, exportFile) => {
                textureTasks.push(exportFile({ type: 'rgbaArray', worker: true }))
            })
            const textureRes = await Promise.all(textureTasks)
            const textureMap = []
            textureRes.forEach((e) => {
                const textureName = e.object.name || e.src.split('/').pop().replace(/\..*$/, '')
                textureMap.push({
                    ...e.data,
                    name: textureName,
                    data: e.data.raw,
                })
            })

            const spineData = await SimpleSpine.processSpineData({
                version: spineVersion,
                skelData: rawData,
                atlasData: atlasData,
                textureData: textureMap,
                textureType: 'rgbaArray',
            })
            spineData.setPremultiplied()

            const spineInstanceObj = SimpleSpine.spine(spineData)
            const node = spineInstanceObj.spine
            node.x = 0
            node.y = 0

            const skins = node.state.data.skeletonData.skins.map((s) => s.name)
            const anims = node.state.data.skeletonData.animations.map((a) => a.name)

            const defaultSkin = skins.length > 1 ? skins[1] : skins[0]
            const defaultAnim = anims.find((a) => a.toLowerCase().includes('idle')) || anims[0]

            setSkin(node, defaultSkin)
            setAnimation(node, defaultAnim)
            node.state.timeScale = isPlaying.value ? 1 : 0
            setupDragInteraction(node)

            world.addChild(node)

            const info = {
                id: `spine_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                cacheKey: spineKey,
                name: spineName,
                instance: markRaw(node),
                skins,
                animations: anims,
                spinePlace,
                currentSkin: defaultSkin,
                currentAnim: defaultAnim,
                currentScale: 1,
                currentRotation: 0,
                currentSpeed: 1,
            }

            spineList.value = [...spineList.value, info]
            if (!activeItemId.value) {
                activeItemId.value = info.id
            }
        } catch (err) {
            console.error('Spine 加载失败:', err)
        } finally {
            loadingKeys.delete(spineKey)
        }
    }
}

// --- Properties Mutations ---
function updateActiveScale(val) {
    if (activeItem.value) {
        activeItem.value.currentScale = val
        activeItem.value.instance.scale.set(val)
        triggerRef(spineList)
    }
}

function updateActiveRotation(val) {
    if (activeItem.value) {
        activeItem.value.currentRotation = val
        activeItem.value.instance.angle = val
        triggerRef(spineList)
    }
}

function updateActiveSpeed(val) {
    if (activeItem.value) {
        activeItem.value.currentSpeed = val
        activeItem.value.instance.state.timeScale = isPlaying.value ? val : 0
        triggerRef(spineList)
    }
}

function updateActiveSkin(val) {
    if (activeItem.value) {
        activeItem.value.currentSkin = val
        setSkin(activeItem.value.instance, val)
        triggerRef(spineList)
    }
}

function updateActiveAnim(val) {
    if (activeItem.value) {
        activeItem.value.currentAnim = val
        setAnimation(activeItem.value.instance, val)
        triggerRef(spineList)
    }
}

function resetActiveTransforms() {
    if (activeItem.value) {
        activeItem.value.instance.x = 0
        activeItem.value.instance.y = 0
        updateActiveScale(1)
        updateActiveRotation(0)
        MessagePlugin.success('已重置模型姿态与缩放')
    }
}

// --- Batch Actions ---
function batchScale(val) {
    batchParams.scale = val
    applyBatchTransform()
}

function batchRotation(val) {
    batchParams.rotation = val
    applyBatchTransform()
}

function applyBatchTransform() {
    spineList.value.forEach((item) => {
        if (selectedIds.value.has(item.id)) {
            item.currentScale = batchParams.scale
            item.currentRotation = batchParams.rotation
            item.instance.scale.set(batchParams.scale)
            item.instance.angle = batchParams.rotation
        }
    })
    triggerRef(spineList)
}

function resetParam(type) {
    if (type === 'scale') batchParams.scale = 1
    if (type === 'rotation') batchParams.rotation = 0
    applyBatchTransform()
}

function applyBatchSkin(val) {
    spineList.value.forEach((item) => {
        if (selectedIds.value.has(item.id)) {
            item.currentSkin = val
            setSkin(item.instance, val)
        }
    })
    triggerRef(spineList)
}

function applyBatchAnim(val) {
    spineList.value.forEach((item) => {
        if (selectedIds.value.has(item.id)) {
            item.currentAnim = val
            setAnimation(item.instance, val)
        }
    })
    triggerRef(spineList)
}

// --- Close & List Updates ---
function closeSpineView() {
    appData.layers.permanent.spineView = false
}

function toggleSelect(id) {
    const newSet = new Set(selectedIds.value)
    newSet.has(id) ? newSet.delete(id) : newSet.add(id)
    selectedIds.value = newSet
}

function handleToggleAll() {
    if (isAllSelected.value) {
        selectedIds.value = new Set()
    } else {
        selectedIds.value = new Set(spineList.value.map((s) => s.id))
    }
}

function deleteSpine(id) {
    const idx = spineList.value.findIndex((item) => item.id === id)
    if (idx === -1) return

    const item = spineList.value[idx]
    if (world) {
        world.removeChild(item.instance)
    }
    item.instance.destroy({ children: true })

    const newList = [...spineList.value]
    newList.splice(idx, 1)
    spineList.value = newList

    selectedIds.value.delete(id)
    if (activeItemId.value === id) {
        activeItemId.value = newList.length > 0 ? newList[0].id : null
    }
    appData.spineView.del(item.spinePlace)
    MessagePlugin.success('已移除对象')
}

function handleMoveLayer({ index, delta }) {
    const newIndex = index + delta
    if (newIndex < 0 || newIndex >= spineList.value.length) return

    const newList = [...spineList.value]
    const [movedItem] = newList.splice(index, 1)
    newList.splice(newIndex, 0, movedItem)
    spineList.value = newList

    if (world) {
        const reversed = [...newList].reverse()
        reversed.forEach((item, idx) => {
            // Keep selectionBox above all models
            const childIdx = selectionBox ? idx + 1 : idx
            world.setChildIndex(item.instance, childIdx)
        })
        if (selectionBox) {
            world.setChildIndex(selectionBox, 0)
        }
    }
}

// --- Viewport Helpers ---
function cycleBackground() {
    const idx = backgroundTypes.indexOf(backgroundType.value)
    backgroundType.value = backgroundTypes[(idx + 1) % backgroundTypes.length]
}

function setSkin(node, name) {
    if (!node.state.data.skeletonData.findSkin(name)) return
    node.skeleton.setSkin(null)
    node.skeleton.setSkinByName(name)
    node.skeleton.setSlotsToSetupPose()
}

function setAnimation(node, name) {
    if (node.state.data.skeletonData.findAnimation(name)) {
        node.state.setAnimation(0, name, true)
    }
}

// Drag & Drop
function setupDragInteraction(node) {
    node.interactive = true
    node.cursor = 'move'
    let dragging = false
    let prevPos = { x: 0, y: 0 }

    const onDragStart = (e) => {
        e.stopPropagation()
        dragging = true
        node.alpha = 0.7

        if (world) {
            const localPos = world.toLocal(e.data.global)
            prevPos = { x: localPos.x, y: localPos.y }
        } else {
            prevPos = { x: e.data.global.x, y: e.data.global.y }
        }

        const item = spineList.value.find((s) => s.instance === node)
        if (item) {
            activeItemId.value = item.id
        }
    }

    const onDragMove = (e) => {
        if (!dragging || !world) return

        const localPos = world.toLocal(e.data.global)
        const dx = localPos.x - prevPos.x
        const dy = localPos.y - prevPos.y

        node.x += dx
        node.y += dy

        prevPos = { x: localPos.x, y: localPos.y }
    }

    const onDragEnd = () => {
        dragging = false
        node.alpha = 1
        triggerRef(spineList)
    }

    node.on('pointerdown', onDragStart)
        .on('pointermove', onDragMove)
        .on('pointerup', onDragEnd)
        .on('pointerupoutside', onDragEnd)
}

// --- Watchers ---
watch(() => appData.spineView.list, loadSpines, { deep: true })
watch(
    () => appData.layers.permanent.spineView,
    (val) => {
        if (app) val ? app.start() : app.stop()
    },
)

watch(isPlaying, (playing) => {
    spineList.value.forEach((item) => {
        item.instance.state.timeScale = playing ? item.currentSpeed : 0
    })
})

// Redundant onMounted hook was removed to prevent concurrent loading race conditions.
</script>

<style scoped>
.spine-editor-container {
    position: absolute;
    width: 100%;
    height: 100%;
    overflow: hidden;
    transition: top 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.spine-editor-container.checkerboard {
    background-color: #1e1e1e;
    background-image:
        linear-gradient(45deg, #252525 25%, transparent 25%), linear-gradient(-45deg, #252525 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #252525 75%), linear-gradient(-45deg, transparent 75%, #252525 75%);
    background-size: 20px 20px;
    background-position:
        0 0,
        0 10px,
        10px -10px,
        -10px 0px;
}
.spine-editor-container.white {
    background-color: #ffffff;
}
.spine-editor-container.black {
    background-color: #111111;
}
.spine-editor-container.green {
    background-color: #00ff00;
}
</style>
