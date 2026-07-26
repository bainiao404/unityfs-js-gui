<template>
    <div v-show="display" class="file-explorer-container">
        <div class="header">
            <div class="header-content">
                <div class="title">{{ title }}</div>
                <div class="breadcrumb-container">
                    <template v-for="(seg, index) in breadcrumbs" :key="seg.path">
                        <span class="breadcrumb-item" @click="getFile(seg.path)">{{ seg.name }}</span>
                        <span v-if="index < breadcrumbs.length - 1" class="breadcrumb-separator">/</span>
                    </template>
                </div>
            </div>
        </div>

        <div class="back-menu" title="返回上一级" @click="goBack">←</div>
        <div class="off-menu" title="关闭" @click="$emit('close')">×</div>

        <div class="file-list-wrapper">
            <div class="file-item select-all-bar" v-if="sortedFileList.length > 0 && multiple">
                <div class="checkbox" :class="{ checked: isAllSelected }" @click="toggleSelectAll"></div>
                <span class="file-name" @click="toggleSelectAll">全选当前目录 ({{ sortedFileList.length }})</span>
            </div>

            <div
                v-for="file in sortedFileList"
                :key="file.path"
                class="file-item"
                :class="{
                    'is-selected': isItemSelected(file),
                    'is-disabled': onlyFolder && file.type === 'file',
                }"
            >
                <div
                    v-if="!(onlyFolder && file.type === 'file')"
                    class="checkbox"
                    :class="{ checked: isItemSelected(file) }"
                    @click.stop="toggleSelection(file)"
                ></div>
                <div v-else class="checkbox-placeholder"></div>

                <div class="item-content" @click="handleItemClick(file)">
                    <img class="file-icon" v-if="file.type == 'file'" src="./文件.png" />
                    <img class="file-icon" v-if="file.type != 'file'" src="./文件夹.png" />
                    <span class="file-name">{{ file.name }}</span>
                </div>
            </div>

            <div v-if="currentFileList.length === 0" class="empty-state">该目录为空</div>
        </div>

        <div class="footer-action-bar">
            <div class="selected-info">
                已选择 <span>{{ selectedItems.length }}</span> {{ onlyFolder ? '个文件夹' : '项' }}
            </div>
            <div class="btn-group">
                <button class="btn-cancel" @click="selectedItems = []">清空选择</button>
                <button class="btn-confirm" :disabled="selectedItems.length === 0" @click="submitSelection">
                    确定选择
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'

const props = defineProps({
    display: Boolean,
    openPath: String,
    title: { type: String, default: '文件浏览器' },
    multiple: { type: Boolean, default: true },
    onlyFolder: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'select'])
const currentFileList = ref([])
const currentPath = ref('')
const selectedItems = ref([])

const breadcrumbs = computed(() => {
    const root = window.cordova?.file?.externalRootDirectory || '/'
    let relativePath = currentPath.value.replace(root, '')
    if (relativePath.endsWith('/')) relativePath = relativePath.slice(0, -1)
    const parts = relativePath.split('/').filter((p) => p)
    const result = [{ name: '根目录', path: root }]
    let tempPath = root
    parts.forEach((part) => {
        tempPath += part + '/'
        result.push({ name: part, path: tempPath })
    })
    return result
})

const sortedFileList = computed(() => {
    return [...currentFileList.value].sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
        return a.name.localeCompare(b.name, 'zh-CN', { numeric: true })
    })
})

const isItemSelected = (item) => selectedItems.value.some((i) => i.path === item.path)
const isAllSelected = computed(() => {
    const selectable = props.onlyFolder ? sortedFileList.value.filter((f) => f.type === 'folder') : sortedFileList.value
    return selectable.length > 0 && selectable.every((item) => isItemSelected(item))
})

function toggleSelection(item) {
    if (props.onlyFolder && item.type === 'file') return
    const index = selectedItems.value.findIndex((i) => i.path === item.path)
    if (index > -1) selectedItems.value.splice(index, 1)
    else {
        if (!props.multiple) selectedItems.value = [item]
        else selectedItems.value.push(item)
    }
}

function toggleSelectAll() {
    const selectable = props.onlyFolder ? sortedFileList.value.filter((f) => f.type === 'folder') : sortedFileList.value
    if (isAllSelected.value) {
        const paths = selectable.map((f) => f.path)
        selectedItems.value = selectedItems.value.filter((i) => !paths.includes(i.path))
    } else {
        selectable.forEach((item) => {
            if (!isItemSelected(item)) selectedItems.value.push(item)
        })
    }
}

function handleItemClick(item) {
    if (item.type === 'folder') getFile(item.path)
    else if (!props.onlyFolder) toggleSelection(item)
}

function submitSelection() {
    let paths = selectedItems.value.map((e) => {
        return {
            ...e,
            path: decodeURIComponent(e.path),
        }
    })
    emit('select', props.multiple ? paths : paths[0])
    emit('close')
}

function getFile(path) {
    if (!path.endsWith('/')) path += '/'
    currentPath.value = path
    if (!window.resolveLocalFileSystemURL) return
    window.resolveLocalFileSystemURL(path, (dirEntry) => {
        const reader = dirEntry.createReader()
        reader.readEntries((entries) => {
            currentFileList.value = entries
                .filter((e) => !e.name.startsWith('.'))
                .map((e) => ({
                    name: e.name,
                    path: e.nativeURL || path + e.name,
                    type: e.isFile ? 'file' : 'folder',
                }))
        })
    })
}

function goBack() {
    const root = window.cordova?.file?.externalRootDirectory
    if (currentPath.value === root || currentPath.value === root + '/') {
        MessagePlugin.info('已经是根目录')
        return
    }
    let path = currentPath.value.replace(/\/$/, '')
    getFile(path.substring(0, path.lastIndexOf('/') + 1))
}

function init() {
    if (props.display) getFile(props.openPath || window.cordova?.file?.externalRootDirectory || '/')
}
watch(
    () => props.display,
    (v) => v && init(),
)
onMounted(() => {
    if (window.cordova) document.addEventListener('deviceready', init, false)
    else init()
})
</script>

<style scoped>
/* 1. 基础容器布局 */
.file-explorer-container {
    position: absolute;
    inset: 0;
    background: #ffffff;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    top: 0px;
    left: 0px;
}

/* 2. 头部及面包屑样式 */
.header {
    height: 50px;
    padding: 0 55px; /* 为左右按钮留出空间 */
    border-bottom: 1px solid #eee;
    display: flex;
    align-items: center;
    background: #fff;
}

.header-content {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    width: 100%;
}

.title {
    font-weight: 600;
    font-size: 15px;
    color: #333;
}

.breadcrumb-container {
    display: flex;
    align-items: center;
    font-size: 12px;
    margin-top: 2px;
    overflow-x: auto;
    white-space: nowrap;
    scrollbar-width: none; /* 隐藏滚动条 */
}

.breadcrumb-container::-webkit-scrollbar {
    display: none;
}

.breadcrumb-item {
    color: #0052d9;
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 4px;
}

.breadcrumb-item:active {
    background: #f0f0f0;
}

.breadcrumb-item:last-child {
    color: #999;
    pointer-events: none;
    font-weight: normal;
}

.breadcrumb-separator {
    margin: 0 2px;
    color: #ccc;
}

/* 3. 顶部功能按钮 (返回 & 关闭) */
.back-menu,
.off-menu {
    position: absolute;
    top: 0;
    width: 50px;
    height: 50px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    font-size: 20px;
    z-index: 10;
    transition: background 0.2s;
}

.back-menu {
    left: 0;
    border-right: 1px solid #f0f0f0;
    color: #333;
}

.off-menu {
    right: 0;
    background: #ff4d4f;
    color: white;
    font-weight: bold;
}

.back-menu:active {
    background: #f5f5f5;
}
.off-menu:active {
    background: #d9363e;
}

/* 4. 列表项样式 */
.file-list-wrapper {
    flex: 1;
    overflow-y: auto;
    background: #fff;
}

.file-item {
    display: flex;
    align-items: center;
    padding: 14px 16px;
    border-bottom: 1px solid #f5f5f5;
    transition: background 0.2s;
}

.file-item:active {
    background-color: #fafafa;
}
.file-item.is-selected {
    background-color: #ecf2fe;
}
.file-item.is-disabled {
    opacity: 0.4;
}

.item-content {
    display: flex;
    align-items: center;
    flex: 1;
    overflow: hidden;
    margin-left: 4px;
}

.file-icon {
    width: 28px;
    height: 28px;
    margin-right: 12px;
    object-fit: contain;
}

.file-name {
    font-size: 14px;
    color: #333;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* 5. 复选框样式 */
.checkbox {
    width: 22px;
    height: 22px;
    border: 2px solid #ddd;
    border-radius: 50%; /* 圆形复选框更现代 */
    flex-shrink: 0;
    position: relative;
    transition: all 0.2s;
}

.checkbox.checked {
    background: #0052d9;
    border-color: #0052d9;
}

.checkbox.checked::after {
    content: '';
    position: absolute;
    width: 6px;
    height: 10px;
    border: 2px solid #fff;
    border-top: 0;
    border-left: 0;
    left: 7px;
    top: 3px;
    transform: rotate(45deg);
}

.checkbox-placeholder {
    width: 22px;
    margin-right: 0;
}

.select-all-bar {
    background: #fafafa;
    position: sticky;
    top: 0;
    z-index: 5;
    font-weight: 500;
}

/* 6. 底部操作栏 */
.footer-action-bar {
    padding: 12px 16px;
    border-top: 1px solid #eee;
    background: #fff;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: calc(12px + env(safe-area-inset-bottom)); /* 适配全面屏 */
}

.selected-info {
    font-size: 13px;
    color: #666;
}
.selected-info span {
    color: #0052d9;
    font-weight: bold;
    margin: 0 2px;
}

.btn-group {
    display: flex;
    gap: 10px;
}

button {
    padding: 10px 18px;
    border-radius: 6px;
    border: none;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.2s;
}

.btn-cancel {
    background: #f4f4f5;
    color: #606266;
}

.btn-confirm {
    background: #0052d9;
    color: white;
}

button:active {
    opacity: 0.7;
}
button:disabled {
    background: #ebeef5;
    color: #c0c4cc;
    cursor: not-allowed;
}

.empty-state {
    padding: 100px 0;
    text-align: center;
    color: #bbb;
    font-size: 14px;
}
</style>
