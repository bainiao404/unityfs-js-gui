<template>
    <div class="list-section">
        <!-- 路径导航栏 (仅在非全局搜索时显示) -->
        <div class="navigation-bar" v-if="!isSearching">
            <button class="nav-back-btn" :disabled="currentDirPath === ''" @click="goUpOneLevel" title="返回上一级">
                <chevron-left-icon class="icon-chevron" />
                返回上一级
            </button>
            <div class="breadcrumbs-container">
                <span class="breadcrumb-item" @click="currentDirPath = ''">根目录 (Root)</span>
                <span class="breadcrumb-separator" v-if="breadcrumbSegs.length > 0">/</span>
                <template v-for="(seg, idx) in breadcrumbSegs" :key="idx">
                    <span class="breadcrumb-item" @click="navigateToSeg(idx)">{{ seg }}</span>
                    <span class="breadcrumb-separator" v-if="idx < breadcrumbSegs.length - 1">/</span>
                </template>
            </div>
        </div>

        <!-- 扁平虚拟列表视图 (全局搜索或类型过滤活跃时) -->
        <FlatObjectListView
            v-if="isSearching"
            :items="items"
            :sort-mode="sortMode"
            :reverse-sort="reverseSort"
            @sort="setSortMode"
        />

        <!-- 传统目录树资源管理器视图 (普通层级浏览) -->
        <div class="explorer-wrapper" v-else>
            <!-- 浏览器表头 -->
            <div class="list-header">
                <div class="header-checkbox-wrapper">
                    <input
                        type="checkbox"
                        :checked="isAllSelected"
                        :indeterminate="isSomeSelected"
                        @change="toggleSelectAll($event.target.checked)"
                        class="list-checkbox"
                    />
                </div>
                <div class="header-id">属性</div>
                <div class="header-main-content">
                    <div class="header-name-path" style="padding-left: 48px">名称</div>
                    <div class="header-meta-column header-type-col">类型</div>
                    <div class="header-meta-column header-size-col">大小</div>
                    <div class="header-meta-column header-ext-col">后缀</div>
                </div>
                <div class="header-action-col"></div>
            </div>

            <div class="explorer-scroll-area">
                <!-- 1. 文件夹列表 -->
                <div
                    v-for="folder in currentContents.folders"
                    :key="folder.path"
                    class="list-item folder-row"
                    @dblclick="currentDirPath = folder.path"
                >
                    <div class="item-checkbox-wrapper" @click.stop>
                        <input
                            type="checkbox"
                            :checked="isFolderSelected(folder)"
                            :indeterminate="isFolderIndeterminate(folder)"
                            @change="toggleFolderSelection(folder)"
                            class="list-checkbox"
                        />
                    </div>
                    <div class="item-id text-muted">文件夹</div>
                    <div class="item-main-content">
                        <div class="item-name-path item-row-content">
                            <folder-open-icon class="item-icon-folder" />
                            <span class="item-name folder-title">{{ folder.name }}</span>
                        </div>
                        <div class="item-meta-column item-type-col text-muted">Directory</div>
                        <div class="item-meta-column item-size-col">-</div>
                        <div class="item-meta-column item-ext-col">-</div>
                    </div>
                    <div class="item-action-col"></div>
                </div>

                <!-- 2. 文件列表 -->
                <div
                    v-for="file in currentContents.files"
                    :key="file.viewId"
                    class="list-item"
                    :draggable="!isHoveringCheckbox"
                    @mousedown="handleItemMouseDown(file)"
                    @dragstart="handleDragStart($event, file)"
                    @click="handleItemClick(file)"
                >
                    <div
                        class="item-checkbox-wrapper"
                        draggable="false"
                        @click.stop
                        @dragstart.stop.prevent
                        @mousedown="handleCheckboxMouseDown($event, file)"
                        @mouseenter="handleCheckboxWrapperMouseEnter(file)"
                        @mouseleave="handleCheckboxWrapperMouseLeave"
                    >
                        <input
                            type="checkbox"
                            :checked="!!file.selected"
                            class="list-checkbox"
                            style="pointer-events: none"
                        />
                    </div>
                    <div class="item-id">{{ file.viewId }}</div>
                    <div class="item-main-content">
                        <div class="item-name-path item-row-content">
                            <component
                                :is="getFileIconComponent(file.className)"
                                :class="['file-icon', getIconColorClass(file.className)]"
                            />
                            <span class="item-name" :title="file.name">
                                {{ getShortName(file) }}
                            </span>
                        </div>
                        <div class="item-meta-column item-type-col" :title="file.className">
                            {{ file.className }}
                        </div>
                        <div class="item-meta-column item-size-col">{{ file.size }}</div>
                        <div class="item-meta-column item-ext-col">{{ file.exportExtension }}</div>
                    </div>
                    <div class="item-action-col">
                        <SingleFileExporter
                            :asset-manager-id="file.assetManagerId"
                            :object-id="file.objectId"
                            :path-i-d="file.pathID"
                        />
                    </div>
                </div>

                <!-- 空提示 -->
                <div
                    v-if="currentContents.folders.length === 0 && currentContents.files.length === 0"
                    class="empty-folder-hint"
                >
                    当前目录为空
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useConfigStore } from '@/stores/useConfigStore'
import { useAssetStore } from '@/stores/useAssetStore'
import { useLayerStore } from '@/layer-system/layerStore'
import { MessagePlugin } from 'tdesign-vue-next'
import FlatObjectListView from './FlatObjectListView.vue'
import { FolderOpenIcon, ChevronLeftIcon } from 'tdesign-icons-vue-next'
import { platform } from '@/utils/platform'
import SingleFileExporter from '../../viewers/SingleFileExporter.vue'
import { getFileIconComponent, getIconColorClass } from '@/utils/iconHelper'

const props = defineProps({
    items: {
        type: Array,
        required: true,
    },
    sortMode: String,
    reverseSort: Boolean,
    userInput: {
        type: String,
        default: '',
    },
})

const emit = defineEmits(['sort'])

const configStore = useConfigStore()
const assetStore = useAssetStore()
const layerStore = useLayerStore()

const currentDirPath = ref('')
const currentDraggingItem = ref(null)
const isNativeDragging = ref(false)

const isSearching = computed(() => {
    return props.userInput.trim() !== ''
})

const breadcrumbSegs = computed(() => {
    return currentDirPath.value.split('/').filter(Boolean)
})

const navigateToSeg = (index) => {
    const segs = breadcrumbSegs.value.slice(0, index + 1)
    currentDirPath.value = segs.join('/')
}

const goUpOneLevel = () => {
    const segs = breadcrumbSegs.value
    if (segs.length <= 1) {
        currentDirPath.value = ''
    } else {
        currentDirPath.value = segs.slice(0, -1).join('/')
    }
}

// 依据路径分割文件夹与文件
const currentContents = computed(() => {
    const foldersMap = new Map()
    const files = []

    const curDir = currentDirPath.value
    const list = props.items
    const curDirLength = curDir.length

    for (let i = 0; i < list.length; i++) {
        const item = list[i]
        if (!item.path) {
            if (curDir === '') {
                files.push(item)
            }
            continue
        }
        if (item._normPath === undefined) {
            item._normPath = item.path.replace(/\\/g, '/')
        }
        const path = item._normPath

        if (curDir === '') {
            const slashIdx = path.indexOf('/')
            if (slashIdx === -1) {
                files.push(item)
            } else {
                const folderName = path.substring(0, slashIdx)
                if (!foldersMap.has(folderName)) {
                    foldersMap.set(folderName, folderName)
                }
            }
        } else {
            if (path.startsWith(curDir) && path.charAt(curDirLength) === '/') {
                const rel = path.substring(curDirLength + 1)
                const slashIdx = rel.indexOf('/')
                if (slashIdx === -1) {
                    files.push(item)
                } else {
                    const folderName = rel.substring(0, slashIdx)
                    if (!foldersMap.has(folderName)) {
                        foldersMap.set(folderName, curDir + '/' + folderName)
                    }
                }
            }
        }
    }

    const folders = Array.from(foldersMap.entries()).map(([name, path]) => ({
        name,
        path,
        isFolder: true,
    }))

    folders.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN', { numeric: true }))

    return { folders, files }
})

// 获取精简名称 (移除冗长的文件夹路径)
const getShortName = (item) => {
    if (!item.path) return item.name || '(empty)'
    const path = item._normPath || (item._normPath = item.path.replace(/\\/g, '/'))
    const lastSlash = path.lastIndexOf('/')
    if (lastSlash === -1) return path
    return path.substring(lastSlash + 1)
}

// 统计各个文件夹下后代文件的数量以及被选中文件的数量，用于快速计算文件夹复选框状态 (O(N) 复杂度)
const folderStats = computed(() => {
    const totalCounts = new Map()
    const selectedCounts = new Map()
    const list = props.items

    for (let i = 0; i < list.length; i++) {
        const item = list[i]
        const path = item._normPath || (item._normPath = item.path ? item.path.replace(/\\/g, '/') : '')
        if (!path) continue

        const lastSlash = path.lastIndexOf('/')
        if (lastSlash !== -1) {
            let idx = path.indexOf('/')
            while (idx !== -1 && idx <= lastSlash) {
                const ancestor = path.substring(0, idx)
                totalCounts.set(ancestor, (totalCounts.get(ancestor) || 0) + 1)
                if (item.selected) {
                    selectedCounts.set(ancestor, (selectedCounts.get(ancestor) || 0) + 1)
                }
                idx = path.indexOf('/', idx + 1)
            }
        }
    }

    return { totalCounts, selectedCounts }
})

// 获取子目录内所有的文件后代
const getDescendants = (folderPath) => {
    const list = props.items
    const result = []
    const prefix = folderPath + '/'
    for (let i = 0; i < list.length; i++) {
        const item = list[i]
        const path = item._normPath || (item._normPath = item.path ? item.path.replace(/\\/g, '/') : '')
        if (path === folderPath || path.startsWith(prefix)) {
            result.push(item)
        }
    }
    return result
}

// 文件夹层级的全选和半选状态计算 (通过预统计的 Map 结构实现 O(1) 状态判断)
const isFolderSelected = (folder) => {
    const total = folderStats.value.totalCounts.get(folder.path) || 0
    if (total === 0) return false
    const sel = folderStats.value.selectedCounts.get(folder.path) || 0
    return sel === total
}

const isFolderIndeterminate = (folder) => {
    const total = folderStats.value.totalCounts.get(folder.path) || 0
    if (total === 0) return false
    const sel = folderStats.value.selectedCounts.get(folder.path) || 0
    return sel > 0 && sel < total
}

const toggleFolderSelection = (folder) => {
    const descendants = getDescendants(folder.path)
    const allChecked = descendants.every((d) => !!d.selected)
    descendants.forEach((d) => {
        d.selected = !allChecked
    })
}

function setSortMode(mode) {
    emit('sort', mode)
}

// 表头全选/半选状态计算
const isAllSelected = computed(() => {
    if (isSearching.value) {
        const list = props.items
        if (list.length === 0) return false
        return list.every((item) => !!item.selected)
    } else {
        const { folders, files } = currentContents.value
        if (folders.length === 0 && files.length === 0) return false

        const filesAll = files.every((f) => !!f.selected)
        if (!filesAll) return false

        for (let i = 0; i < folders.length; i++) {
            if (!isFolderSelected(folders[i])) return false
        }
        return true
    }
})

const isSomeSelected = computed(() => {
    if (isSearching.value) {
        const list = props.items
        if (list.length === 0) return false
        const all = list.every((item) => !!item.selected)
        if (all) return false
        return list.some((item) => !!item.selected)
    } else {
        const { folders, files } = currentContents.value
        if (folders.length === 0 && files.length === 0) return false
        if (isAllSelected.value) return false

        if (files.some((f) => !!f.selected)) return true

        for (let i = 0; i < folders.length; i++) {
            if (isFolderSelected(folders[i]) || isFolderIndeterminate(folders[i])) return true
        }
        return false
    }
})

const toggleSelectAll = (checked) => {
    if (isSearching.value) {
        props.items.forEach((item) => {
            item.selected = checked
        })
    } else {
        const { folders, files } = currentContents.value
        files.forEach((f) => {
            f.selected = checked
        })
        folders.forEach((f) => {
            const descendants = getDescendants(f.path)
            descendants.forEach((d) => {
                d.selected = checked
            })
        })
    }
}

// 处理点击/双击预览
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

    layerStore.addComponent({
        name: viewName,
        props: {
            objectId: fileObject.objectId,
            assetManagerId: fileObject.assetManagerId,
            pathID: fileObject.pathID,
        },
    })
}

const handleItemMouseDown = (item) => {
    if (!platform.isElectron) return
    currentDraggingItem.value = item
}

const handleDragStart = async (event, item) => {
    if (!platform.isElectron) return

    event.preventDefault()
    isNativeDragging.value = true

    const selectedItems = props.items.filter((i) => i.selected)
    const isDragSelection = selectedItems.length > 0 && selectedItems.some((i) => i.viewId === item.viewId)
    const itemsToExport = isDragSelection ? selectedItems : [item]

    const tempFilePaths = await platform.prepareDragOut(item, itemsToExport, configStore.data)

    if (tempFilePaths && tempFilePaths.length > 0 && isNativeDragging.value) {
        platform.startDragOut(tempFilePaths)
    }
}

const isHoveringCheckbox = ref(false)
const isSwipingSelection = ref(false)
const swipeTargetValue = ref(false)

const handleCheckboxMouseDown = (event, item) => {
    event.stopPropagation()
    isSwipingSelection.value = true
    swipeTargetValue.value = !item.selected
    item.selected = swipeTargetValue.value
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
        isNativeDragging.value = false
    }
}

onMounted(() => {
    window.addEventListener('dragenter', handleGlobalDragEnterOrOver, true)
    window.addEventListener('dragover', handleGlobalDragEnterOrOver, true)
    window.addEventListener('drop', handleGlobalDrop, true)
    window.addEventListener('dragend', handleGlobalDragEnd, true)

    window.addEventListener('mouseup', handleCheckboxMouseUp, true)
    window.addEventListener('mouseup', handleGlobalDragEnd, true)
    window.addEventListener('mousemove', handleGlobalDragEnd, true)
    window.addEventListener('focus', handleGlobalDragEnd, true)
})

onUnmounted(() => {
    window.removeEventListener('dragenter', handleGlobalDragEnterOrOver, true)
    window.removeEventListener('dragover', handleGlobalDragEnterOrOver, true)
    window.removeEventListener('drop', handleGlobalDrop, true)
    window.removeEventListener('dragend', handleGlobalDragEnd, true)

    window.removeEventListener('mouseup', handleCheckboxMouseUp, true)
    window.removeEventListener('mouseup', handleGlobalDragEnd, true)
    window.removeEventListener('mousemove', handleGlobalDragEnd, true)
    window.removeEventListener('focus', handleGlobalDragEnd, true)
})
</script>

<style scoped>
.list-section {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    background: var(--td-bg-color-container);
}

.navigation-bar {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    background: var(--td-bg-color-secondarycontainer);
    border-bottom: 1px solid var(--td-component-border);
    flex-shrink: 0;
    gap: 16px;
    box-sizing: border-box;
}

.nav-back-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: var(--td-bg-color-container);
    border: 1px solid var(--td-component-border);
    padding: 4px 10px;
    font-size: 12px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    color: var(--td-text-color-primary);
    transition: all 0.2s;
}

.nav-back-btn:hover:not(:disabled) {
    border-color: var(--td-brand-color);
    color: var(--td-brand-color);
    background: var(--td-brand-color-light);
}

.nav-back-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.icon-chevron {
    font-size: 14px;
}

.breadcrumbs-container {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    overflow-x: auto;
    white-space: nowrap;
    scrollbar-width: none;
    flex: 1;
}

.breadcrumbs-container::-webkit-scrollbar {
    display: none;
}

.breadcrumb-item {
    color: var(--td-text-color-secondary);
    cursor: pointer;
    padding: 2px 6px;
    border-radius: 4px;
    transition: all 0.2s;
}

.breadcrumb-item:hover {
    color: var(--td-brand-color);
    background: var(--td-bg-color-component-hover);
}

.breadcrumb-item:last-child {
    color: var(--td-text-color-primary);
    font-weight: 600;
    pointer-events: none;
}

.breadcrumb-separator {
    color: var(--td-text-color-placeholder);
    user-select: none;
}

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

.explorer-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
}

.explorer-scroll-area {
    flex: 1;
    overflow-y: auto;
    width: 100%;
}

.folder-row {
    background: var(--td-bg-color-container);
}

.item-row-content {
    flex-direction: row !important;
    align-items: center;
    justify-content: flex-start;
    overflow: hidden;
    min-width: 0;
    padding-right: 12px;
}

.item-icon-folder {
    font-size: 20px;
    color: #e3a300;
    margin-right: 8px;
    flex-shrink: 0;
}

.file-icon {
    font-size: 18px;
    margin-right: 8px;
    flex-shrink: 0;
}

.scroller-wrapper .list-item .item-name-path {
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
}

.item-text-wrapper {
    display: flex;
    flex-direction: column;
    justify-content: center;
    overflow: hidden;
    flex: 1;
    min-width: 0;
}

.folder-title {
    font-weight: 600;
}

.empty-folder-hint {
    padding: 80px 0;
    text-align: center;
    color: var(--td-text-color-placeholder);
    font-size: 14px;
}

.text-muted {
    color: var(--td-text-color-placeholder) !important;
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
    flex-direction: row;
    justify-content: flex-start;
    min-width: 100px;
    padding: 0 12px;
    height: 100%;
    box-sizing: border-box;
    align-content: center;
    align-items: center;
}

.item-name {
    font-weight: 600;
    font-size: 13px;
    color: var(--td-text-color-primary);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
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
    z-index: 2;
}

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
