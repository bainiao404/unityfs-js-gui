<template>
    <div
        class="homeTabsBox"
        ref="Home"
        @drop="fileHandleDrop"
        @dragover.prevent
        @dragenter="isDragging = true"
        @dragleave="isDragging = false"
    >
        <div v-if="isImporting" class="import-overlay">
            <t-loading size="large" :text="`${i18nStore.t('importCountMsg')}${importCount} ...`" />
        </div>

        <div class="top-nav-bar">
            <div class="menu-actions">
                <t-button variant="text" @click="opneFileView">{{ i18nStore.t('file') }}</t-button>
                <t-button variant="text" @click="openConfigurationView">{{ i18nStore.t('setting') }}</t-button>
                <t-button variant="text" @click="openExportView">{{ i18nStore.t('export') }}</t-button>
                <t-button variant="text" @click="layerStore.permanent.spineView = true">{{
                    i18nStore.t('spinePreview')
                }}</t-button>
                <t-button variant="text" @click="openToolsView">{{ i18nStore.t('tools') }}</t-button>
                <t-button variant="text" @click="openAboutView">{{ i18nStore.t('about') }}</t-button>
            </div>

            <div class="nav-tab-switcher">
                <button
                    class="nav-tab-btn"
                    :class="{ active: activeTab === 'fileList' }"
                    @click="activeTab = 'fileList'"
                >
                    {{ i18nStore.t('resourceList') }}
                </button>
                <button
                    class="nav-tab-btn"
                    :class="{ active: activeTab === 'FileProperties' }"
                    @click="activeTab = 'FileProperties'"
                >
                    {{ i18nStore.t('fileProperties') }}
                </button>
            </div>

            <t-tag v-if="isWebBrowser" theme="warning" variant="light" style="margin-left: auto; margin-right: 12px">
                {{ i18nStore.t('webModeHint') }}
            </t-tag>
        </div>

        <div class="main-content-layout">
            <!-- Content Area -->
            <div class="workspace-area">
                <div v-show="activeTab === 'fileList'" class="tab-content-wrapper">
                    <ObjectListView></ObjectListView>
                </div>
                <div v-show="activeTab === 'FileProperties'" class="tab-content-wrapper">
                    <AssetFileListView></AssetFileListView>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { onMounted, ref, useTemplateRef, computed } from 'vue'
import { UnityFSGui } from '@/services/unity/UnityFSGuiService'
import { useConfigStore } from '@/stores/useConfigStore'
import { useAssetStore } from '@/stores/useAssetStore'
import { useLayerStore } from '@/layer-system/layerStore'
import { platform } from '@/utils/platform'
import { GKD } from '@/assets/gkd-js-0.2/index'
import { MessagePlugin } from 'tdesign-vue-next'
import { useI18nStore } from '@/stores/i18n'

import ObjectListView from '../components/Home/ObjectListView.vue'
import AssetFileListView from '../components/Home/AssetFileListView.vue'

const configStore = useConfigStore()
const assetStore = useAssetStore()
const layerStore = useLayerStore()
const i18nStore = useI18nStore()
const HomeDiv = useTemplateRef('Home')

// 状态管理
const isImporting = ref(false)
const importCount = ref(0)
const isDragging = ref(false)
const activeTab = ref('fileList')

const isWebBrowser = computed(() => platform.isWeb)

/**
 * 初始化拖拽监听
 */
function start() {
    const div = HomeDiv.value
    if (!div) return

    // 必须阻止 dragover 的默认行为，drop 才会生效
    div.addEventListener('dragover', (e) => {
        e.preventDefault()
        e.stopPropagation()
    })
}

/**
 * 拖拽放置核心逻辑
 */
async function fileHandleDrop(event) {
    event.preventDefault()
    event.stopPropagation()
    isDragging.value = false

    const items = event.dataTransfer.items
    const files = event.dataTransfer.files

    // 1. Electron 桌面端路径处理逻辑
    if (!isWebBrowser.value && files.length > 0 && files[0].path) {
        let bundleList = []
        for (let i = 0; i < files.length; i++) {
            bundleList.push(files[i].path.replace(/\\/g, '/'))
        }
        await getFilesFromPaths(bundleList)
        return
    }

    // 2. 浏览器端 FileSystem API 处理逻辑
    if (items && items.length > 0) {
        isImporting.value = true
        importCount.value = 0
        let allFiles = []

        try {
            // 在执行任何 await 操作之前，必须同步提取出所有 entry
            // 否则在 Chrome 浏览器中，DataTransferItemList 在第一个 await 异步 Tick 结束后会被清空
            const entries = []
            for (let i = 0; i < items.length; i++) {
                const entry = items[i].webkitGetAsEntry()
                if (entry) {
                    entries.push(entry)
                }
            }

            for (const entry of entries) {
                const results = await traverseFileTree(entry)
                allFiles.push(...results)
            }

            if (allFiles.length > 0) {
                await newBundle(allFiles)
            }
        } catch (error) {
            console.error('浏览器导入失败:', error)
            MessagePlugin.error('文件读取失败')
        } finally {
            isImporting.value = false
        }
    }
}

async function traverseFileTree(entry, path = '') {
    const files = []

    if (entry.isFile) {
        const file = await new Promise((resolve) => entry.file(resolve))
        importCount.value++
        files.push({
            path: path + entry.name,
            file: file,
        })
    } else if (entry.isDirectory) {
        const dirReader = entry.createReader()

        // 循环读取目录，直到 readEntries 返回空数组（处理分页）
        const readAllEntries = async () => {
            const entries = await new Promise((resolve, reject) => {
                dirReader.readEntries(resolve, reject)
            })

            if (entries.length > 0) {
                for (const childEntry of entries) {
                    const childFiles = await traverseFileTree(childEntry, path + entry.name + '/')
                    files.push(...childFiles)
                }
                // 继续读取下一页
                const nextFiles = await readAllEntries()
                files.push(...nextFiles)
            }
            return []
        }
        await readAllEntries()
    }
    return files
}

/**
 * 桌面端路径读取
 */
async function getFilesFromPaths(paths) {
    isImporting.value = true
    let files = []
    try {
        for (const p of paths) {
            let isDir = false
            try {
                const stats = await GKD.fs.lstat(p)
                isDir = stats.isDirectory()
            } catch (err) {
                isDir = !p.includes('.')
            }

            if (isDir) {
                try {
                    const subPaths = await GKD.fs.readdirAllFile(p)
                    files.push(...subPaths.map((sp) => ({ path: sp.replace(/\\/g, '/') })))
                } catch (err) {
                    files.push({ path: p })
                }
            } else {
                files.push({ path: p })
            }
        }
        await newBundle(files)
    } finally {
        isImporting.value = false
    }
}

/**
 * 统一资源加载入口
 */
async function newBundle(bundleList) {
    UnityFSGui.assetManagers.clear()

    // 批量添加到管理器
    bundleList.forEach((item) => {
        UnityFSGui.assetManagers.add({
            path: item.path,
            file: item.file || null, // 浏览器 File 对象
        })
    })

    // 保存至当前打开的文件及历史记录中
    const isWeb = platform.isWeb
    const filesToSave = bundleList.map((item) => {
        const fileObj = {
            path: item.path,
            type: 'file',
        }
        if (isWeb && item.file) {
            fileObj.raw = item.file
            // 写入会话缓存，供后续恢复使用
            UnityFSGui.webFileCache.set(item.path, item.file)
        }
        return fileObj
    })

    // 更新当前打开列表
    configStore.data.userOpenFile = filesToSave

    // 保存至导入历史（可记录最近 20 次操作）
    const historyEntry = {
        id: Date.now(),
        timestamp: Date.now(),
        files: filesToSave.map((f) => ({ path: f.path, type: f.type })),
    }
    const history = configStore.data.importHistory || []
    configStore.data.importHistory = [historyEntry, ...history].slice(0, 20)

    assetStore.assetManagerUI.up()
    MessagePlugin.info(`正在打开 ${bundleList.length} 个资源`)
}

// 视图切换逻辑
const opneFileView = () => layerStore.addComponent({ name: 'OpenFile' })
const openConfigurationView = () => layerStore.addComponent({ name: 'ConfigurationView' })
const openExportView = () => layerStore.addComponent({ name: 'ExportView' })
const openToolsView = () => layerStore.addComponent({ name: 'ToolsView' })
const openAboutView = () => layerStore.addComponent({ name: 'AboutView' })

onMounted(start)

// setTimeout(() => {
//     UnityFSGui.assetManagers.add({
//         path: 'C:/Users/Administrator/Desktop/BaiNiaoGKD/cache/LilYangeNext/CacheFile/remotegroup_assets_skeletondataasset/1124.asset_4ffce932e3a3d01804cb88c3856ca606.bundle',
//     })
//     appData.assetManagerUI.up()
// }, 1000)
</script>
<style scoped>
.import-overlay {
    position: absolute;
    inset: 0;
    z-index: 9999;
    background: rgba(255, 255, 255, 0.95);
    display: flex;
    justify-content: center;
    align-items: center;
}
.top-nav-bar {
    position: absolute;
    top: 0px;
    left: 0px;
    height: 32px;
    width: 100%;
    display: flex;
    align-items: center;
    border-bottom: 1px solid var(--td-component-border);
    background: var(--td-bg-color-container);
    z-index: 10;
    padding-left: 8px;
    box-sizing: border-box;
}
.menu-actions {
    display: flex;
    align-items: center;
    gap: 4px;
}
.homeTabsBox {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0px;
    left: 0px;
    margin: 0px;
    transform: scale(1);
}
.main-content-layout {
    position: absolute;
    bottom: 0px;
    left: 0px;
    height: calc(100% - 32px);
    width: 100%;
    display: flex;
    overflow: hidden;
}
.sidebar-nav {
    display: none;
}
.nav-tab-switcher {
    display: flex;
    align-items: center;
    border: 1px solid var(--td-component-border);
    background: var(--td-bg-color-page);
    height: 24px;
    padding: 1px;
    box-sizing: border-box;
    margin-left: 20px;
}
.nav-tab-btn {
    border: none;
    background: transparent;
    font-size: 11px;
    font-weight: 500;
    color: var(--td-text-color-secondary);
    padding: 0 12px;
    height: 100%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
}
.nav-tab-btn:hover {
    color: var(--td-text-color-primary);
    background-color: var(--td-bg-color-component-hover);
}
.nav-tab-btn.active {
    color: var(--td-brand-color);
    background-color: var(--td-bg-color-container);
    font-weight: 600;
    box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.05);
}
.workspace-area {
    flex: 1;
    position: relative;
    height: 100%;
    overflow: hidden;
    background-color: var(--td-bg-color-page);
}
.tab-content-wrapper {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
}

@media (max-width: 600px) {
    .top-nav-bar {
        overflow-x: auto;
        white-space: nowrap;
        scrollbar-width: none; /* Hide scrollbar in Firefox */
    }
    .top-nav-bar::-webkit-scrollbar {
        display: none; /* Hide scrollbar in Chrome/Safari */
    }
    .menu-actions,
    .nav-tab-switcher {
        flex-shrink: 0;
    }
    /* Reduce margin slightly on mobile to save horizontal space */
    .nav-tab-switcher {
        margin-left: 10px;
    }
}
</style>
