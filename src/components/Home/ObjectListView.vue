<template>
    <div class="container">
        <!-- 顶部筛选与搜索栏 -->
        <div class="top-section">
            <div class="search-bar">
                <t-input placeholder="搜索资源名称、类型、路径..." v-model="userInput" clearable />
                <t-select
                    v-model="filterType"
                    multiple
                    placeholder="筛选资源类型"
                    :min-collapsed-num="1"
                    collapse-tags
                    :options="objectType"
                    clearable
                    class="type-filter-select"
                />
            </div>
        </div>

        <!-- 列表区域 -->
        <div class="list-section">
            <!-- 表头 -->
            <div class="list-header" ref="listHeaderDiv">
                <div class="header-checkbox-wrapper">
                    <input
                        type="checkbox"
                        :checked="isAllSelected"
                        :indeterminate="isSomeSelected"
                        @change="toggleSelectAll($event.target.checked)"
                        class="list-checkbox"
                    />
                </div>
                <div class="header-id" @click="setSortMode('viewId')">
                    <span :class="{ 'current-sort': sortMode === 'viewId' }" class="sortable-header">ID</span>
                </div>
                <div class="header-main-content">
                    <div class="header-name-path" @click="setSortMode('name')">
                        <span :class="{ 'current-sort': sortMode === 'name' }" class="sortable-header" style="font-size: 14px;">名称 / 路径</span>
                    </div>
                    <div class="header-meta-column header-type-col" @click="setSortMode('className')">
                        <span :class="{ 'current-sort': sortMode === 'className' }" class="sortable-header">类型</span>
                    </div>
                    <div class="header-meta-column header-size-col" @click="setSortMode('size')">
                        <span :class="{ 'current-sort': sortMode === 'size' }" class="sortable-header">大小</span>
                    </div>
                    <div class="header-meta-column header-ext-col" @click="setSortMode('exportExtension')">
                        <span :class="{ 'current-sort': sortMode === 'exportExtension' }" class="sortable-header">后缀</span>
                    </div>
                </div>
                <div class="header-action-col"></div>
            </div>

            <div class="scroller-wrapper">
                <RecycleScroller
                    class="scroller"
                    :items="filteredObjects"
                    :item-size="RecycleScrollerItemSize"
                    key-field="viewId"
                    v-slot="{ item }"
                    v-if="filteredObjects.length > 0"
                >
                    <!-- 列表内容 -->
                    <div
                        class="list-item"
                        :draggable="!isHoveringCheckbox"
                        @mousedown="handleItemMouseDown(item)"
                        @dragstart="handleDragStart($event, item)"
                        @click="handleItemClick(item)"
                    >
                        <div
                            class="item-checkbox-wrapper"
                            draggable="false"
                            @click.stop
                            @dragstart.stop.prevent
                            @mousedown="handleCheckboxMouseDown($event, item)"
                            @mouseenter="handleCheckboxWrapperMouseEnter(item)"
                            @mouseleave="handleCheckboxWrapperMouseLeave"
                        >
                            <input
                                type="checkbox"
                                :checked="!!item.selected"
                                class="list-checkbox"
                                style="pointer-events: none"
                            />
                        </div>
                        <div class="item-id">{{ item.viewId }}</div>
                        <div class="item-main-content">
                            <div class="item-name-path">
                                <span class="item-name" :title="item.name">{{ item.name || '<empty>' }}</span>
                                <span class="item-path" :title="item.path">{{ item.path || '无路径' }}</span>
                            </div>
                            <div class="item-meta-column item-type-col" :title="item.className">{{ item.className }}</div>
                            <div class="item-meta-column item-size-col">{{ item.size }}</div>
                            <div class="item-meta-column item-ext-col">{{ item.exportExtension }}</div>
                        </div>
                        <div class="item-action-col">
                            <SingleFileExporter
                                :asset-manager-id="item.assetManagerId"
                                :object-id="item.objectId"
                                :path-i-d="item.pathID"
                            ></SingleFileExporter>
                        </div>
                    </div>
                </RecycleScroller>
                <div v-else style="display: flex; justify-content: center; margin: 40px">打开或者拖动文件到此</div>
            </div>
        </div>
        <LoadProgressCard :progress="loadPercentage"></LoadProgressCard>
    </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, shallowRef, useTemplateRef, watchEffect, markRaw } from 'vue'
import { UnityFSGui } from '@/assets/unityfs-gui'
import { AppData } from '@/stores/counter'
import { MessagePlugin } from 'tdesign-vue-next'
import { RecycleScroller } from 'vue-virtual-scroller'
import LoadProgressCard from '../Class/LoadProgressCard.vue'
import SingleFileExporter from '../FileView/SingleFileExporter.vue'

// 环境及 Electron API 初始化
const ENV = {
    isElectron: !!window.__dirname || (window.process && window.process.versions.electron),
}
const fs = window.require ? window.require('fs') : null
const path = window.require ? window.require('path') : null
const os = window.require ? window.require('os') : null
const { ipcRenderer } = window.require && ENV.isElectron ? window.require('electron') : {}

const dragFilePromise = ref(null)
const currentDraggingItem = ref(null)
const isNativeDragging = ref(false)

const appData = AppData()
const objectType = ref([])
const fileObjectsRaw = shallowRef([])
const userInput = ref('')
const sortMode = ref('id')
const reverseSort = ref(false)
const filterType = ref([])
const RecycleScrollerItemSize = ref(40)
const listHeaderDiv = useTemplateRef('listHeaderDiv')
let loadPercentage = ref(-1)

// 计算属性：处理筛选和排序
const filteredObjects = computed(() => {
    let result = fileObjectsRaw.value

    // 类型筛选
    if (filterType.value.length > 0) {
        const filterSet = new Set(filterType.value)
        result = result.filter((item) => filterSet.has(item.className))
    }

    // 搜索筛选
    if (userInput.value.trim()) {
        const searchTerm = userInput.value.trim().toLowerCase()
        result = result.filter(
            (item) =>
                item.name.toLowerCase().includes(searchTerm) ||
                item.className.toLowerCase().includes(searchTerm) ||
                (item.path && item.path.toLowerCase().includes(searchTerm)) ||
                item.exportExtension.toLowerCase().includes(searchTerm),
        )
    }

    // 排序
    result = sortObjects(result, sortMode.value, reverseSort.value)

    //存储结果
    appData.objectUI.currentList = markRaw(result)

    return result
})

// 排序函数
const sortObjects = (objects, mode, reverse) => {
    const sorted = [...objects]

    sorted.sort((a, b) => {
        let aVal = a[mode]
        let bVal = b[mode]

        if (mode === 'size') {
            return (aVal || 0) - (bVal || 0)
        }

        // 处理可能为空的字符串
        aVal = aVal || ''
        bVal = bVal || ''

        return aVal.localeCompare(bVal)
    })

    return reverse ? sorted.reverse() : sorted
}

// 设置排序模式
const setSortMode = (mode) => {
    if (sortMode.value === mode) {
        reverseSort.value = !reverseSort.value
    } else {
        reverseSort.value = false
        sortMode.value = mode
    }
}

// 更新视图数据
const updateViewData = async () => {
    loadPercentage.value = 0
    const list = []
    const typeSet = new Set()
    for (let managerIndex = 0; managerIndex < UnityFSGui.assetManagers.list.length; managerIndex++) {
        loadPercentage.value = managerIndex / UnityFSGui.assetManagers.list.length

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
                pathID: String(element.pathID), // 用于精确定位，避免大文件索引偏移
                name: element.name,
                className,
                size: element.size,
                exportExtension: element.exportExtension || 'null',
                path: path ? path.path : '',
                viewId: managerIndex + '-' + objectIndex,
                selected: false, // 初始不选中
            })
        })
    }

    objectType.value = Array.from(typeSet).map((type) => ({
        label: type,
        value: type,
    }))

    fileObjectsRaw.value = markRaw(list)
    appData.objectUI.list = markRaw(list)

    loadPercentage.value = -1
}

// 全选/半选状态计算
const isAllSelected = computed(() => {
    const list = filteredObjects.value
    if (list.length === 0) return false
    return list.every((item) => !!item.selected)
})

const isSomeSelected = computed(() => {
    const list = filteredObjects.value
    if (list.length === 0) return false
    const all = list.every((item) => !!item.selected)
    if (all) return false
    return list.some((item) => !!item.selected)
})

const toggleSelectAll = (checked) => {
    const list = filteredObjects.value
    list.forEach((item) => {
        item.selected = checked
    })
}

// 处理点击事件
const handleItemClick = (fileObject) => {
    const viewNameMap = {
        Texture2D: 'ImgView',
        MonoBehaviour: 'TextView',
        TextAsset: 'TextView',
        Sprite: 'ImgView',
        AudioClip: 'AudioView',
        Mesh: 'MeshView',
        MonoScript: 'MonoScriptView',
        Material: 'MaterialView',
        Font: 'FontView',
    }

    const viewName = viewNameMap[fileObject.className]

    if (!viewName) {
        MessagePlugin.info('找不到适配的预览器')
        return
    }

    appData.layers.addComponent({
        name: viewName,
        props: {
            objectId: fileObject.objectId,
            assetManagerId: fileObject.assetManagerId,
            pathID: fileObject.pathID, // 用于精确定位，避免大文件索引偏移
        },
    })
}

const handleGlobalDragEnterOrOver = (event) => {
    if (currentDraggingItem.value) {
        event.stopPropagation()
        event.preventDefault()
        event.dataTransfer.dropEffect = 'none'
    }
}

const handleGlobalDrop = (event) => {
    if (currentDraggingItem.value) {
        event.stopPropagation()
        event.preventDefault()
        handleGlobalDragEnd()
    }
}

const handleGlobalDragEnd = () => {
    if (isNativeDragging.value || currentDraggingItem.value) {
        currentDraggingItem.value = null
        dragFilePromise.value = null
        isNativeDragging.value = false
    }
}

onMounted(() => {
    const observer = new ResizeObserver((entries) => {
        upListItemHeight()
    })
    // 监听目标元素
    observer.observe(listHeaderDiv.value)
    upListItemHeight()

    window.addEventListener('dragenter', handleGlobalDragEnterOrOver, true)
    window.addEventListener('dragover', handleGlobalDragEnterOrOver, true)
    window.addEventListener('drop', handleGlobalDrop, true)
    window.addEventListener('dragend', handleGlobalDragEnd, true)

    // Add extra window listeners to reliably capture the end of native OS drags
    window.addEventListener('mouseup', handleGlobalDragEnd, true)
    window.addEventListener('mousemove', handleGlobalDragEnd, true)
    window.addEventListener('focus', handleGlobalDragEnd, true)
})

onUnmounted(() => {
    window.removeEventListener('dragenter', handleGlobalDragEnterOrOver, true)
    window.removeEventListener('dragover', handleGlobalDragEnterOrOver, true)
    window.removeEventListener('drop', handleGlobalDrop, true)
    window.removeEventListener('dragend', handleGlobalDragEnd, true)

    window.removeEventListener('mouseup', handleGlobalDragEnd, true)
    window.removeEventListener('mousemove', handleGlobalDragEnd, true)
    window.removeEventListener('focus', handleGlobalDragEnd, true)
})

function upListItemHeight() {
    const height = listHeaderDiv.value?.offsetHeight
    if (height && height > 0) {
        RecycleScrollerItemSize.value = height
    }
}

function clickMore(item) {
    appData.layers.addComponent({
        name: 'SingleFileExporter',
        props: {
            objectId: item.objectId,
            assetManagerId: item.assetManagerId,
        },
    })
    console.log(item)
}

const handleItemMouseDown = (item) => {
    if (!ENV.isElectron || !fs || !path || !os) return

    currentDraggingItem.value = item

    // 获取当前过滤列表中所有已勾选的项
    const selectedItems = filteredObjects.value.filter((i) => i.selected)
    // 如果拖拽项属于已选中集合，则导出所有选中项；否则仅导出拖拽项本身
    const isDragSelection = selectedItems.length > 0 && selectedItems.some((i) => i.viewId === item.viewId)
    const itemsToExport = isDragSelection ? selectedItems : [item]

    dragFilePromise.value = (async () => {
        try {
            const tempDir = path.join(os.tmpdir(), 'UnityJS-GUI-DragExport')
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true })
            }

            const exportPromises = itemsToExport.map(async (currentItem) => {
                const assetManager = await UnityFSGui.assetManagers.get(currentItem.assetManagerId)
                const object = currentItem.pathID
                    ? assetManager.getObjectInfoByPathId(BigInt(currentItem.pathID))
                    : assetManager.getObjectInfos()?.[currentItem.objectId]

                if (!object) return null

                let rawData
                let fileName = object.name

                const exportConfig = {
                    type: 'arrayBuffer',
                    worker: true,
                    cutting: object.className === 'Sprite' ? appData.config.data.spriteCutting : false,
                }

                const fileInfo = await assetManager.exportFile(object, exportConfig)
                if (fileInfo && fileInfo.isFolder) {
                    const modelTempPaths = []
                    for (const [subPath, subData] of Object.entries(fileInfo.files)) {
                        const tempFilePath = path.join(tempDir, fileInfo.name, subPath)
                        const fileDir = path.dirname(tempFilePath)
                        if (!fs.existsSync(fileDir)) {
                            fs.mkdirSync(fileDir, { recursive: true })
                        }
                        const bufferData = subData instanceof Uint8Array
                            ? Buffer.from(subData.buffer, subData.byteOffset, subData.byteLength)
                            : Buffer.from(subData)
                        fs.writeFileSync(tempFilePath, bufferData)
                        modelTempPaths.push(tempFilePath)
                    }
                    return modelTempPaths
                }

                if (!fileInfo || (!fileInfo.data && !fileInfo.data?.raw)) {
                    const reader = object._reader
                    if (reader) {
                        const currentOffset = reader.offset
                        reader.seek(object.offset)
                        rawData = reader.read(object.size)
                        reader.seek(currentOffset)
                        const ext = object.object?.exportExtension || '.dat'
                        if (!fileName.includes('.') && ext) {
                            fileName += ext
                        }
                    }
                } else {
                    rawData = fileInfo?.data?.raw
                    fileName = fileInfo.src.split(/[\\/]/).pop()
                }

                if (!rawData) return null

                const tempFilePath = path.join(tempDir, fileName)

                let bufferData
                if (rawData instanceof Uint8Array) {
                    bufferData = Buffer.from(rawData.buffer, rawData.byteOffset, rawData.byteLength)
                } else if (rawData instanceof ArrayBuffer) {
                    bufferData = Buffer.from(rawData)
                } else {
                    bufferData = Buffer.from(rawData)
                }

                fs.writeFileSync(tempFilePath, bufferData)
                return tempFilePath
            })

            const exportedPathsResults = await Promise.all(exportPromises)
            const exportedPaths = exportedPathsResults.flat().filter(Boolean)
            return exportedPaths
        } catch (e) {
            console.error('Pre-export failed:', e)
            return []
        }
    })()
}

const handleDragStart = async (event, item) => {
    if (!ENV.isElectron || !ipcRenderer) return

    event.preventDefault()
    isNativeDragging.value = true

    let tempFilePaths = []
    if (currentDraggingItem.value === item && dragFilePromise.value) {
        tempFilePaths = await dragFilePromise.value
    }

    if (!tempFilePaths || tempFilePaths.length === 0) {
        handleItemMouseDown(item)
        if (dragFilePromise.value) {
            tempFilePaths = await dragFilePromise.value
        }
    }

    if (tempFilePaths && tempFilePaths.length > 0) {
        const iconPath = path && window.__dirname ? path.join(window.__dirname, 'Export.png') : ''

        if (tempFilePaths.length === 1) {
            ipcRenderer.send('ondragstart', {
                filePath: tempFilePaths[0],
                iconPath: iconPath,
                iconSize: { width: 32, height: 32 },
            })
        } else {
            ipcRenderer.send('ondragstart', {
                filePaths: tempFilePaths,
                iconPath: iconPath,
                iconSize: { width: 32, height: 32 },
            })
        }
    }
}

const isHoveringCheckbox = ref(false)
const isSwipingSelection = ref(false)
const swipeTargetValue = ref(false)

const handleCheckboxMouseDown = (event, item) => {
    event.stopPropagation() // 阻止触发行的 mousedown（拖放预导出）
    isSwipingSelection.value = true
    isHoveringCheckbox.value = true
    item.selected = !item.selected
    swipeTargetValue.value = item.selected

    window.addEventListener('mouseup', handleCheckboxMouseUp)
}

const handleCheckboxWrapperMouseEnter = (item) => {
    isHoveringCheckbox.value = true
    if (isSwipingSelection.value) {
        item.selected = swipeTargetValue.value
    }
}

const handleCheckboxWrapperMouseLeave = () => {
    if (!isSwipingSelection.value) {
        isHoveringCheckbox.value = false
    }
}

const handleCheckboxMouseUp = () => {
    isSwipingSelection.value = false
    isHoveringCheckbox.value = false
    window.removeEventListener('mouseup', handleCheckboxMouseUp)
}

// 监听数据更新
watchEffect(() => {
    if (appData.assetManagerUI.upTime) {
        updateViewData()
    }
})
</script>

<style scoped>
.container {
    height: 100%;
    width: 100%;
    position: absolute;
    top: 0;
    left: 0;
    display: flex;
    flex-direction: column;
}

/* 顶部筛选与搜索栏 */
.top-section {
    position: absolute;
    top: 0;
    left: 0;
    height: 40px;
    width: 100%;
    display: flex;
    align-items: center;
    background: var(--td-bg-color-secondarycontainer);
    border-bottom: 1px solid var(--td-component-border);
    padding: 0 12px;
    box-sizing: border-box;
    z-index: 5;
}

.search-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
}

.type-filter-select {
    width: 250px;
}

/* 列表区域样式 */
.list-section {
    position: absolute;
    bottom: 0;
    left: 0;
    height: calc(100% - 40px);
    width: 100%;
    display: flex;
    flex-direction: column;
    background: var(--td-bg-color-container);
}

/* scroller wrapper filling the rest of list-section */
.scroller-wrapper {
    flex: 1;
    width: 100%;
    position: relative;
    overflow: hidden;
}

.scroller {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    overflow-y: scroll;
}

.sortable-header {
    cursor: pointer;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    user-select: none;
}

.sortable-header:hover {
    color: var(--td-brand-color-hover);
}

.current-sort {
    color: var(--td-brand-color);
    font-weight: bold;
}

/* 极简扁平原生 Checkbox 样式 */
.list-checkbox {
    appearance: none;
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    border: 1px solid var(--td-component-border);
    background: #fff;
    cursor: pointer;
    position: relative;
    outline: none;
}
.list-checkbox:checked {
    background: var(--td-brand-color);
    border-color: var(--td-brand-color);
}
.list-checkbox:checked::after {
    content: '';
    position: absolute;
    left: 4px;
    top: 1px;
    width: 4px;
    height: 7px;
    border: solid #fff;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
}
.list-checkbox:indeterminate::after {
    content: '';
    position: absolute;
    left: 3px;
    top: 5px;
    width: 6px;
    height: 2px;
    background: var(--td-brand-color);
}

/* Column Wrappers and Cell Dividers */
.header-checkbox-wrapper,
.item-checkbox-wrapper {
    width: 48px;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    border-right: 1px solid var(--td-component-border);
    flex-shrink: 0;
}

.header-id,
.item-id {
    width: 60px;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    border-right: 1px solid var(--td-component-border);
    font-family: var(--td-font-family-monospace, monospace);
    font-size: 12px;
    color: var(--td-text-color-secondary);
    flex-shrink: 0;
}

.item-main-content,
.header-main-content {
    flex: 1;
    display: flex;
    height: 100%;
    align-items: center;
    min-width: 0;
}

.item-name-path,
.header-name-path {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 100px;
    padding: 0 12px;
    height: 100%;
    box-sizing: border-box;
}

.item-name {
    font-weight: 600;
    font-size: 13px;
    color: var(--td-text-color-primary);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.item-path {
    font-size: 11px;
    color: var(--td-text-color-placeholder);
    font-family: var(--td-font-family-monospace, monospace);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    margin-top: 2px;
}

.item-meta-column,
.header-meta-column {
    display: flex;
    align-items: center;
    height: 100%;
    box-sizing: border-box;
    font-size: 12px;
    border-left: 1px solid var(--td-component-border);
    padding: 0 12px;
    flex-shrink: 0;
}

.item-type-col,
.header-type-col {
    width: 140px;
    color: var(--td-text-color-secondary);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.item-size-col,
.header-size-col {
    width: 100px;
    color: var(--td-text-color-secondary);
    justify-content: flex-end;
    font-family: var(--td-font-family-monospace, monospace);
}

.item-ext-col,
.header-ext-col {
    width: 80px;
    color: var(--td-text-color-secondary);
    justify-content: center;
    font-family: var(--td-font-family-monospace, monospace);
}

.item-action-col,
.header-action-col {
    width: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-left: 1px solid var(--td-component-border);
    height: 100%;
    flex-shrink: 0;
}

/* -------------------------------------------------------
 * UNIFIED ROW: Both .list-header and .list-item share
 * the exact same structural styles. Only color-related
 * properties differ between header and item.
 * ------------------------------------------------------- */

/* Shared row base */
.list-header,
.list-item {
    display: flex;
    align-items: center;
    height: 40px;
    padding: 0;
    user-select: none;
    -webkit-user-select: none;
    border-bottom: 1px solid var(--td-component-border);
    overflow: hidden;
}

/* Row-specific color tokens */
.list-item {
    cursor: pointer;
    background: var(--td-bg-color-container);
    transition: background-color 0.1s ease;
}

.list-item:hover {
    background-color: var(--td-bg-color-component-hover);
}

.list-header {
    background: var(--td-bg-color-secondarycontainer);
    flex-shrink: 0;
    overflow-y: scroll;
    z-index: 2;
}

/* Hover effects for sortable header cells */
.header-meta-column,
.header-name-path,
.header-id {
    cursor: pointer;
    transition: background-color 0.15s ease;
}
.header-meta-column:hover,
.header-name-path:hover,
.header-id:hover {
    background-color: var(--td-bg-color-component-hover);
}

@media (max-width: 600px) {
    /* Stack top search and select elements */
    .top-section {
        height: 76px;
        padding: 6px 12px;
    }
    .search-bar {
        flex-direction: column;
        align-items: stretch;
        gap: 6px;
    }
    .type-filter-select {
        width: 100% !important;
    }
    .list-section {
        height: calc(100% - 76px);
    }

    /* Hide less critical columns on mobile to ensure name/path gets full width */
    .header-id,
    .item-id,
    .header-type-col,
    .item-type-col,
    .header-size-col,
    .item-size-col,
    .header-ext-col,
    .item-ext-col {
        display: none !important;
    }

    /* Adjust checkbox and action column widths slightly on small screens */
    .header-checkbox-wrapper,
    .item-checkbox-wrapper {
        width: 40px;
    }
    .item-action-col,
    .header-action-col {
        width: 40px;
    }
}
</style>
