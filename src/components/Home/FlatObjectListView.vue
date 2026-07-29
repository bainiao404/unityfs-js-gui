<template>
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
                    <span :class="{ 'current-sort': sortMode === 'name' }" class="sortable-header">名称 / 路径</span>
                </div>
                <div class="header-meta-column header-type-col" @click="setSortMode('className')">
                    <span :class="{ 'current-sort': sortMode === 'className' }" class="sortable-header">类型</span>
                </div>
                <div class="header-meta-column header-size-col" @click="setSortMode('size')">
                    <span :class="{ 'current-sort': sortMode === 'size' }" class="sortable-header">大小</span>
                </div>
                <div class="header-meta-column header-ext-col" @click="setSortMode('exportExtension')">
                    <span :class="{ 'current-sort': sortMode === 'exportExtension' }" class="sortable-header"
                        >后缀</span
                    >
                </div>
            </div>
            <div class="header-action-col"></div>
        </div>

        <div class="scroller-wrapper">
            <RecycleScroller
                class="scroller"
                :items="items"
                :item-size="RecycleScrollerItemSize"
                key-field="viewId"
                v-slot="{ item }"
                v-if="items.length > 0"
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
                            <component
                                :is="getFileIconComponent(item.className)"
                                :class="['file-icon', getIconColorClass(item.className)]"
                            />
                            <div class="item-text-wrapper">
                                <span class="item-name" :title="item.name">{{ item.name || '(empty)' }}</span>
                                <span class="item-path" :title="item.path">{{ item.path || '无路径' }}</span>
                            </div>
                        </div>
                        <div class="item-meta-column item-type-col" :title="item.className">
                            {{ item.className }}
                        </div>
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
            <div v-else style="display: flex; justify-content: center; margin: 40px">没有找到匹配的资源</div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, useTemplateRef } from 'vue'
import { useConfigStore } from '@/stores/useConfigStore'
import { useAssetStore } from '@/stores/useAssetStore'
import { useLayerStore } from '@/layer-system/layerStore'
import { MessagePlugin } from 'tdesign-vue-next'
import { RecycleScroller } from 'vue-virtual-scroller'
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
})

const emit = defineEmits(['sort'])

const configStore = useConfigStore()
const assetStore = useAssetStore()
const layerStore = useLayerStore()

const currentDraggingItem = ref(null)
const isNativeDragging = ref(false)

const listHeaderDiv = ref(null)
const RecycleScrollerItemSize = ref(40)

function setSortMode(mode) {
    emit('sort', mode)
}

// 全选/半选状态计算
const isAllSelected = computed(() => {
    const list = props.items
    if (list.length === 0) return false
    return list.every((item) => !!item.selected)
})

const isSomeSelected = computed(() => {
    const list = props.items
    if (list.length === 0) return false
    const all = list.every((item) => !!item.selected)
    if (all) return false
    return list.some((item) => !!item.selected)
})

const toggleSelectAll = (checked) => {
    props.items.forEach((item) => {
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

    layerStore.addComponent({
        name: viewName,
        props: {
            objectId: fileObject.objectId,
            assetManagerId: fileObject.assetManagerId,
            pathID: fileObject.pathID, // 用于精确定位，避免大文件索引偏移
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

    // 获取当前过滤列表中所有已勾选的项
    const selectedItems = props.items.filter((i) => i.selected)
    // 如果拖拽项属于已选中集合，则导出所有选中项；否则仅导出拖拽项本身
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
    event.stopPropagation() // 防止拖动冲突
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

function upListItemHeight() {
    const height = listHeaderDiv.value?.offsetHeight
    if (height && height > 0) {
        RecycleScrollerItemSize.value = height
    }
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
    upListItemHeight()
    window.addEventListener('resize', upListItemHeight)

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
    window.removeEventListener('resize', upListItemHeight)

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
    flex-direction: column;
    justify-content: center;
    min-width: 100px;
    padding: 0 12px;
    height: 100%;
    box-sizing: border-box;
}

.list-item .item-name-path {
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
}

.file-icon {
    font-size: 20px;
    margin-right: 8px;
    flex-shrink: 0;
}

.item-text-wrapper {
    display: flex;
    flex-direction: column;
    justify-content: center;
    overflow: hidden;
    flex: 1;
    min-width: 0;
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
    overflow-y: scroll;
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
