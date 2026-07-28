<template>
    <div class="open-file-viewport">
        <div class="split-container">
            <!-- Sidebar Navigation -->
            <div class="sidebar-pane">
                <div class="sidebar-header">
                    <h2 class="sidebar-title">{{ i18nStore.t('openFileTab') }}</h2>
                </div>

                <div class="sidebar-menu">
                    <!-- Tab 1: Local Import -->
                    <div class="menu-item" :class="{ active: activeTab === 'local' }" @click="activeTab = 'local'">
                        <file-add-icon class="menu-icon" />
                        <span class="menu-label">{{ i18nStore.t('localImport') }}</span>
                        <span v-if="localFiles.length > 0" class="menu-badge count-badge">{{ localFiles.length }}</span>
                    </div>

                    <!-- Tab 2: Web Download -->
                    <div class="menu-item" :class="{ active: activeTab === 'web' }" @click="activeTab = 'web'">
                        <Download1Icon class="menu-icon" />
                        <span class="menu-label">{{ i18nStore.t('webDownload') }}</span>
                        <span v-if="urlList.length > 0" class="menu-badge count-badge">{{ urlList.length }}</span>
                    </div>

                    <!-- Tab 3: History Records -->
                    <div class="menu-item" :class="{ active: activeTab === 'history' }" @click="activeTab = 'history'">
                        <history-icon class="menu-icon" />
                        <span class="menu-label">{{ i18nStore.t('historyRecords') }}</span>
                        <span v-if="appData.config.data.importHistory?.length > 0" class="menu-badge info-badge">
                            {{ appData.config.data.importHistory.length }}
                        </span>
                    </div>

                    <!-- Tab 4: Download Progress -->
                    <div
                        class="menu-item"
                        :class="{ active: activeTab === 'downloads' }"
                        @click="activeTab = 'downloads'"
                    >
                        <download-icon class="menu-icon" />
                        <span class="menu-label">{{ i18nStore.t('downloadProgress') }}</span>
                        <span v-if="downloadingCount > 0" class="menu-badge danger-badge">{{ downloadingCount }}</span>
                    </div>
                </div>

                <!-- Sidebar Footer -->
                <div class="sidebar-footer">
                    <div class="platform-info">
                        <span class="info-label">{{ i18nStore.t('platform') }}:</span>
                        <t-tag variant="light-outline" size="small" theme="primary" class="platform-tag">
                            {{ platformName }}
                        </t-tag>
                    </div>
                </div>
            </div>

            <!-- Content Panel -->
            <div class="content-pane">
                <Transition name="fade-slide" mode="out-in">
                    <!-- Pane 1: Local Import -->
                    <div v-if="activeTab === 'local'" class="pane-content" key="local">
                        <div class="pane-header">
                            <h3 class="pane-title">{{ i18nStore.t('localFileTitle') }}</h3>
                            <t-button
                                variant="text"
                                theme="danger"
                                size="small"
                                @click="clearLocalFiles"
                                :disabled="!localFiles.length"
                            >
                                {{ i18nStore.t('clearList') }}
                            </t-button>
                        </div>

                        <div class="pane-body">
                            <div class="list-container-new">
                                <t-list v-if="localFiles.length > 0" split size="small">
                                    <t-list-item v-for="(file, index) in localFiles" :key="index">
                                        <t-list-item-main>
                                            <div class="file-path-text monospace-text">{{ file.path }}</div>
                                            <t-tag
                                                size="small"
                                                variant="light"
                                                :theme="file.type === 'folder' ? 'warning' : 'default'"
                                            >
                                                {{
                                                    file.type === 'folder'
                                                        ? i18nStore.t('addFolder')
                                                        : i18nStore.t('addFile')
                                                }}
                                            </t-tag>
                                        </t-list-item-main>
                                        <template #action>
                                            <t-button
                                                variant="text"
                                                shape="circle"
                                                size="small"
                                                @click="removeLocalFile(index)"
                                            >
                                                <template #icon><close-icon /></template>
                                            </t-button>
                                        </template>
                                    </t-list-item>
                                </t-list>
                                <t-empty v-else :description="i18nStore.t('noFilesSelected')" />
                            </div>
                        </div>

                        <div class="pane-footer">
                            <div class="action-buttons">
                                <t-button variant="outline" @click="handleOpen('file')">
                                    <template #icon><file-add-icon /></template>
                                    {{ i18nStore.t('addFile') }}
                                </t-button>

                                <t-button variant="outline" @click="handleOpen('folder')">
                                    <template #icon><folder-open-icon /></template>
                                    {{ i18nStore.t('addFolder') }}
                                </t-button>

                                <t-button
                                    theme="primary"
                                    @click="opneFileStart"
                                    :disabled="!localFiles.length"
                                    style="margin-left: auto; min-width: 120px"
                                >
                                    {{ i18nStore.t('startImport') }}
                                </t-button>
                            </div>
                        </div>
                    </div>

                    <!-- Pane 2: Web Download -->
                    <div v-else-if="activeTab === 'web'" class="pane-content" key="web">
                        <div class="pane-header">
                            <h3 class="pane-title">{{ i18nStore.t('webDownloadTitle') }}</h3>
                            <t-button
                                variant="text"
                                theme="danger"
                                size="small"
                                @click="clearDownloadPath"
                                :disabled="!appData.config.data.userDownloadPath"
                            >
                                {{ i18nStore.t('clearInput') }}
                            </t-button>
                        </div>

                        <div class="pane-body flex-body">
                            <t-textarea
                                v-model="appData.config.data.userDownloadPath"
                                placeholder="URL..."
                                :autosize="{ minRows: 4, maxRows: 6 }"
                                @change="upUserList"
                                class="url-textarea"
                            />

                            <div class="list-title mt-16">URLs ({{ urlList.length }})</div>
                            <div class="list-container-new flex-list">
                                <t-list v-if="urlList.length > 0" split size="small">
                                    <t-list-item v-for="(url, index) in urlList" :key="index">
                                        <div class="url-text monospace-text">{{ url }}</div>
                                    </t-list-item>
                                </t-list>
                                <t-empty v-else description="-" />
                            </div>
                        </div>

                        <div class="pane-footer">
                            <t-button theme="primary" block @click="downloadFile" :disabled="!urlList.length">
                                <template #icon><Download1Icon /></template>
                                {{ i18nStore.t('downloadAndImport') }}
                            </t-button>
                        </div>
                    </div>

                    <!-- Pane 3: History Records -->
                    <div v-else-if="activeTab === 'history'" class="pane-content" key="history">
                        <div class="pane-header">
                            <h3 class="pane-title">{{ i18nStore.t('historyRecords') }}</h3>
                            <t-button
                                variant="text"
                                theme="danger"
                                size="small"
                                @click="clearHistory"
                                :disabled="
                                    !appData.config.data.importHistory || !appData.config.data.importHistory.length
                                "
                            >
                                {{ i18nStore.t('clearHistory') }}
                            </t-button>
                        </div>

                        <div class="pane-body">
                            <div class="list-container-new history-container">
                                <t-list
                                    v-if="
                                        appData.config.data.importHistory &&
                                        appData.config.data.importHistory.length > 0
                                    "
                                    split
                                    size="small"
                                >
                                    <t-list-item v-for="entry in appData.config.data.importHistory" :key="entry.id">
                                        <t-list-item-main>
                                            <div class="history-time monospace-text">
                                                {{ formatTime(entry.timestamp) }}
                                            </div>
                                            <div class="history-files-list">
                                                <div
                                                    v-for="(file, fIdx) in expandedHistoryItems[entry.id]
                                                        ? entry.files
                                                        : entry.files.slice(0, 3)"
                                                    :key="fIdx"
                                                    class="history-file-item monospace-text"
                                                >
                                                    <file1-icon style="font-size: 14px" /> {{ file.path }}
                                                </div>
                                                <div v-if="entry.files && entry.files.length > 3">
                                                    <t-link
                                                        theme="primary"
                                                        style="
                                                            cursor: pointer;
                                                            display: inline-flex;
                                                            align-items: center;
                                                            gap: 2px;
                                                            margin-top: 4px;
                                                            font-size: 12px;
                                                        "
                                                        @click="toggleExpand(entry.id)"
                                                    >
                                                        <chevron-up-icon v-if="expandedHistoryItems[entry.id]" />
                                                        <chevron-down-icon v-else />
                                                        {{
                                                            expandedHistoryItems[entry.id]
                                                                ? i18nStore.t('collapse')
                                                                : `${i18nStore.t('expandAll')} (${entry.files.length})`
                                                        }}
                                                    </t-link>
                                                </div>
                                            </div>
                                        </t-list-item-main>
                                        <template #action>
                                            <t-button
                                                variant="outline"
                                                size="small"
                                                @click="restoreHistoryEntry(entry)"
                                            >
                                                {{ i18nStore.t('restoreHistory') }}
                                            </t-button>
                                        </template>
                                    </t-list-item>
                                </t-list>
                                <t-empty v-else :description="i18nStore.t('noHistory')" />
                            </div>
                        </div>
                    </div>

                    <!-- Pane 4: Download Progress -->
                    <div v-else-if="activeTab === 'downloads'" class="pane-content" key="downloads">
                        <div class="pane-header">
                            <h3 class="pane-title">{{ i18nStore.t('downloadProgress') }}</h3>
                        </div>

                        <div class="pane-body">
                            <div class="list-container-new download-pane-container">
                                <DownloadUserView />
                            </div>
                        </div>
                    </div>
                </Transition>
            </div>
        </div>

        <CordovaFileView
            v-if="platform.isCordova"
            :title="platform.cordovaOpenType.value === 'folder' ? i18nStore.t('addFolder') : i18nStore.t('addFile')"
            :open-path="openPath"
            :display="platform.cordovaFileViewVisible.value"
            :only-folder="platform.cordovaOpenType.value === 'folder'"
            @select="onOpenFileCordova"
            @close="closeCordovaFileView"
        />
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { UnityFSGui } from '@/assets/unityfs-gui'
import { AppData } from '@/stores/counter'
import { MessagePlugin } from 'tdesign-vue-next'
import DownloadUserView from './DownloadUserView.vue'
import CordovaFileView from '../Class/CordovaFileView/CordovaFileView.vue'
import {
    FileAddIcon,
    FolderOpenIcon,
    Download1Icon,
    HistoryIcon,
    DownloadIcon,
    CloseIcon,
    ChevronUpIcon,
    ChevronDownIcon,
    File1Icon,
} from 'tdesign-icons-vue-next'
import { useI18nStore } from '@/stores/i18n'
import { platform } from '@/utils/platform'

// 状态管理
const appData = AppData()
const i18nStore = useI18nStore()
const localFiles = computed(() => appData.config.data.userOpenFile)
const urlList = ref([])
const activeTab = ref('local')

// 下载状态管理
const rawDownloadList = ref({})
const downloadingCount = computed(() => Object.keys(rawDownloadList.value).length)

// 历史记录折叠状态
const expandedHistoryItems = ref({})
const toggleExpand = (id) => {
    expandedHistoryItems.value[id] = !expandedHistoryItems.value[id]
}

// 平台判断，统一使用封装的 platform 单例
const isWebBrowser = computed(() => platform.isWebBrowser)
const isCordova = computed(() => platform.isCordova)
const isElectron = computed(() => platform.isElectron)
const platformName = computed(() => platform.name)

onMounted(() => {
    upUserList()

    // 初始化并监听下载进度以动态更新徽标数量
    rawDownloadList.value = { ...UnityFSGui.downloadManager.list }
    const prevProgress = UnityFSGui.downloadManager.progress
    UnityFSGui.downloadManager.progress = function (e) {
        rawDownloadList.value = { ...this.list }
        if (prevProgress) prevProgress.call(this, e)
    }
})

// 缓存上一次 Cordova 打开的路径
const openPath = ref('')

function onOpenFileCordova(selection) {
    const items = Array.isArray(selection) ? selection : [selection]
    if (items.length === 0) return

    const lastItem = items[items.length - 1]
    openPath.value = lastItem.path

    if (typeof platform.resolveSelection === 'function') {
        platform.resolveSelection(selection)
    }
}

function closeCordovaFileView() {
    platform.cordovaFileViewVisible.value = false
    if (typeof platform.resolveSelection === 'function') {
        platform.resolveSelection(null)
    }
}

async function handleOpen(type) {
    try {
        const selection = await platform.selectFilesOrFolder({ type })
        if (!selection) return

        const items = Array.isArray(selection) ? selection : [selection]
        items.forEach((item) => {
            const cleanPath = item.path
            // 保存至会话缓存 (Web端需要)
            if (platform.isWebBrowser && item.raw) {
                UnityFSGui.webFileCache.set(cleanPath, item.raw)
            }
            if (!appData.config.data.userOpenFile.find((e) => e.path == cleanPath)) {
                appData.config.data.userOpenFile.push({
                    path: cleanPath,
                    type: item.type,
                    raw: item.raw || null,
                })
            }
        })
    } catch (err) {
        console.error('选择文件/文件夹失败:', err)
        MessagePlugin.error('选择文件/文件夹失败')
    }
}

// 移除选中的文件
function removeLocalFile(index) {
    appData.config.data.userOpenFile.splice(index, 1)
}

function clearLocalFiles() {
    appData.config.data.userOpenFile = []
}

function clearDownloadPath() {
    appData.config.data.userDownloadPath = ''
    urlList.value = []
}

function upUserList() {
    const path = appData.config.data.userDownloadPath
    if (!path) {
        urlList.value = []
        return
    }
    urlList.value = path
        .split('\n')
        .map((e) => e.trim())
        .filter((e) => e !== '')
}

async function opneFileStart() {
    if (localFiles.value.length === 0) return
    appData.objectUI.isImporting = true
    appData.objectUI.importCount = 0

    // 保存至导入历史（可记录最近 20 次操作）
    const historyEntry = {
        id: Date.now(),
        timestamp: Date.now(),
        files: localFiles.value.map((f) => ({ path: f.path, type: f.type })),
    }
    const history = appData.config.data.importHistory || []
    appData.config.data.importHistory = [historyEntry, ...history].slice(0, 20)

    try {
        await UnityFSGui.openFiles(localFiles.value, (importedCount) => {
            appData.objectUI.importCount = importedCount
        })
        appData.assetManagerUI.up()
        MessagePlugin.success('导入完成')
    } catch (err) {
        console.error(err)
        MessagePlugin.error('导入失败: ' + err.message)
    } finally {
        appData.objectUI.isImporting = false
    }
}

async function restoreHistoryEntry(entry) {
    appData.objectUI.isImporting = true
    appData.objectUI.importCount = 0

    try {
        const isWeb = isWebBrowser.value
        const filesToOpen = entry.files.map((f) => {
            const restored = { path: f.path, type: f.type }
            if (isWeb) {
                const cachedRaw = UnityFSGui.webFileCache.get(f.path)
                if (cachedRaw) {
                    restored.raw = cachedRaw
                } else {
                    throw new Error(
                        `Web端刷新后无法恢复本地文件: ${f.path}，请重新选择文件。但在 Electron/Cordova 平台支持完全恢复。`,
                    )
                }
            }
            return restored
        })

        // 更新当前导入文件列表
        appData.config.data.userOpenFile = filesToOpen

        await UnityFSGui.openFiles(filesToOpen, (importedCount) => {
            appData.objectUI.importCount = importedCount
        })
        appData.assetManagerUI.up()
        MessagePlugin.success('恢复导入完成')
    } catch (err) {
        console.error(err)
        MessagePlugin.error(err.message)
    } finally {
        appData.objectUI.isImporting = false
    }
}

function clearHistory() {
    appData.config.data.importHistory = []
}

function formatTime(timestamp) {
    const d = new Date(timestamp)
    const padding = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${padding(d.getMonth() + 1)}-${padding(d.getDate())} ${padding(d.getHours())}:${padding(d.getMinutes())}:${padding(d.getSeconds())}`
}

async function downloadFile() {
    if (urlList.value.length === 0) return
    try {
        await UnityFSGui.downloadFiles(urlList.value)
        MessagePlugin.success('下载任务已提交')
    } catch (err) {
        MessagePlugin.error('提交失败: ' + err.message)
    }
}
</script>

<style scoped>
.open-file-viewport {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0px;
    left: 0px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background-color: var(--td-bg-color-page);
}

.split-container {
    display: flex;
    flex: 1;
    height: 100%;
    overflow: hidden;
}

/* Sidebar Styling */
.sidebar-pane {
    width: 220px;
    background-color: var(--td-bg-color-container);
    border-right: 1px solid var(--td-component-border);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    padding: 16px 0;
    box-sizing: border-box;
}

.sidebar-header {
    padding: 0 16px 16px;
    border-bottom: 1px solid var(--td-component-border);
    margin-bottom: 12px;
}

.sidebar-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--td-text-color-primary);
}

.sidebar-menu {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 0 12px;
    overflow-y: auto;
}

.menu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    color: var(--td-text-color-secondary);
    user-select: none;
    position: relative;
}

.menu-item:hover {
    background-color: var(--td-bg-color-container-hover);
    color: var(--td-text-color-primary);
}

.menu-item.active {
    background-color: var(--td-bg-color-component-active);
    color: var(--td-brand-color);
    font-weight: 600;
}

.menu-icon {
    font-size: 16px;
}

.menu-label {
    font-size: 13px;
    flex: 1;
}

.menu-badge {
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 700;
    min-width: 16px;
    text-align: center;
    line-height: 1;
}

.count-badge {
    background-color: var(--td-brand-color-light);
    color: var(--td-brand-color);
}

.info-badge {
    background-color: var(--td-bg-color-component-active);
    color: var(--td-text-color-secondary);
}

.danger-badge {
    background-color: var(--td-error-color-light);
    color: var(--td-error-color);
}

.sidebar-footer {
    padding: 12px 16px 0;
    border-top: 1px solid var(--td-component-border);
    margin-top: auto;
}

.platform-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    color: var(--td-text-color-placeholder);
}

/* Content Pane Styling */
.content-pane {
    flex: 1;
    display: flex;
    flex-direction: column;
    background-color: var(--td-bg-color-page);
    overflow: hidden;
}

.pane-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    box-sizing: border-box;
}

.pane-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    background-color: var(--td-bg-color-container);
    border-bottom: 1px solid var(--td-component-border);
    flex-shrink: 0;
}

.pane-title {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: var(--td-text-color-primary);
}

.pane-body {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
}

.pane-body.flex-body {
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.url-textarea {
    flex-shrink: 0;
}

.list-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--td-text-color-placeholder);
    margin-bottom: 6px;
    flex-shrink: 0;
}

.flex-list {
    flex: 1;
    overflow-y: auto;
}

.pane-footer {
    padding: 16px 20px;
    background-color: var(--td-bg-color-container);
    border-top: 1px solid var(--td-component-border);
    flex-shrink: 0;
}

.action-buttons {
    display: flex;
    gap: 12px;
    width: 100%;
    align-items: center;
}

.list-container-new {
    border: 1px solid var(--td-component-border);
    border-radius: 6px;
    background-color: var(--td-bg-color-container);
    padding: 4px;
    min-height: 200px;
    overflow-y: auto;
}

.list-container-new.history-container {
    max-height: none;
    min-height: none;
    flex: 1;
}

.list-container-new.download-pane-container {
    max-height: none;
    min-height: none;
    flex: 1;
    padding: 0;
    border: none;
    background: transparent;
}

.file-path-text {
    font-family: monospace;
    font-size: 12px;
    word-break: break-all;
    color: var(--td-text-color-primary);
    margin-right: 8px;
}

.url-text {
    font-family: monospace;
    font-size: 11px;
    color: var(--td-text-color-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 4px 8px;
}

.history-time {
    font-weight: 600;
    font-size: 12px;
    color: var(--td-text-color-primary);
    margin-bottom: 4px;
}

.history-files-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 4px;
}

.history-file-item {
    font-size: 11px;
    color: var(--td-text-color-secondary);
    display: flex;
    align-items: center;
    gap: 4px;
    word-break: break-all;
}

/* Scrollbar styling */
.list-container-new::-webkit-scrollbar,
.sidebar-menu::-webkit-scrollbar,
.pane-body::-webkit-scrollbar {
    width: 6px;
    height: 6px;
}

.list-container-new::-webkit-scrollbar-thumb,
.sidebar-menu::-webkit-scrollbar-thumb,
.pane-body::-webkit-scrollbar-thumb {
    background: var(--td-bg-color-component-hover);
    border-radius: 3px;
}

/* Transition Animations */
.fade-slide-enter-active,
.fade-slide-leave-active {
    transition: all 0.15s ease;
}

.fade-slide-enter-from {
    opacity: 0;
    transform: translateY(4px);
}

.fade-slide-leave-to {
    opacity: 0;
    transform: translateY(-4px);
}

/* Responsive Style */
@media (max-width: 768px) {
    .split-container {
        flex-direction: column;
    }

    .sidebar-pane {
        width: 100%;
        border-right: none;
        border-bottom: 1px solid var(--td-component-border);
        padding: 8px 0;
        flex-direction: row;
        align-items: center;
    }

    .sidebar-header {
        display: none;
    }

    .sidebar-menu {
        flex-direction: row;
        overflow-x: auto;
        padding: 0 16px;
        gap: 8px;
        width: 100%;
        scrollbar-width: none;
    }

    .sidebar-menu::-webkit-scrollbar {
        display: none;
    }

    .menu-item {
        padding: 6px 12px;
        flex-shrink: 0;
    }

    .sidebar-footer {
        display: none;
    }

    .pane-header {
        padding: 12px 16px;
    }

    .pane-body {
        padding: 16px;
    }

    .pane-footer {
        padding: 12px 16px;
    }
}
</style>
