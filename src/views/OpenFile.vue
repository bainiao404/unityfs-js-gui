<template>
    <div class="open-file-viewport">
        <div class="split-container">
            <!-- Sidebar Navigation -->
            <div class="sidebar-pane">
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
                        <span v-if="configStore.data.importHistory?.length > 0" class="menu-badge info-badge">
                            {{ configStore.data.importHistory.length }}
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
                    <LocalImportPane v-if="activeTab === 'local'" key="local" />
                    <WebDownloadPane v-else-if="activeTab === 'web'" key="web" />
                    <ImportHistoryPane v-else-if="activeTab === 'history'" key="history" />
                    <DownloadProgressPane v-else-if="activeTab === 'downloads'" key="downloads" />
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
import { UnityFSGui } from '@/services/unity/UnityFSGuiService'
import { useConfigStore } from '@/stores/useConfigStore'
import { useI18nStore } from '@/stores/i18n'
import { platform } from '@/utils/platform'
import CordovaFileView from '../components/CordovaFileView/CordovaFileView.vue'
import LocalImportPane from '../components/OpenFile/LocalImportPane.vue'
import WebDownloadPane from '../components/OpenFile/WebDownloadPane.vue'
import ImportHistoryPane from '../components/OpenFile/ImportHistoryPane.vue'
import DownloadProgressPane from '../components/OpenFile/DownloadProgressPane.vue'
import { FileAddIcon, Download1Icon, HistoryIcon, DownloadIcon } from 'tdesign-icons-vue-next'

const configStore = useConfigStore()
const i18nStore = useI18nStore()

const activeTab = ref('local')

// 状态计算属性
const localFiles = computed(() => configStore.data.userOpenFile)
const urlList = computed(() => {
    const path = configStore.data.userDownloadPath
    if (!path) return []
    return path
        .split('\n')
        .map((e) => e.trim())
        .filter((e) => e !== '')
})

// 下载状态管理
const rawDownloadList = ref({})
const downloadingCount = computed(() => Object.keys(rawDownloadList.value).length)

const platformName = computed(() => platform.name)

onMounted(() => {
    // 监听下载进度更新进度数量徽标
    rawDownloadList.value = { ...UnityFSGui.downloadManager.list }
    const prevProgress = UnityFSGui.downloadManager.progress
    UnityFSGui.downloadManager.progress = function (e) {
        rawDownloadList.value = { ...this.list }
        if (prevProgress) prevProgress.call(this, e)
    }
})

// Cordova 专有逻辑
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

/* Sub-panes layout through Deep selectors */
:deep(.pane-content) {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    box-sizing: border-box;
}

:deep(.pane-header) {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 20px;
    background-color: var(--td-bg-color-container);
    border-bottom: 1px solid var(--td-component-border);
    flex-shrink: 0;
}

:deep(.pane-title) {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: var(--td-text-color-primary);
}

:deep(.pane-body) {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
}

:deep(.pane-body.flex-body) {
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

:deep(.url-textarea) {
    flex-shrink: 0;
}

:deep(.list-title) {
    font-size: 12px;
    font-weight: 600;
    color: var(--td-text-color-placeholder);
    margin-bottom: 6px;
    flex-shrink: 0;
}

:deep(.flex-list) {
    flex: 1;
    overflow-y: auto;
}

:deep(.pane-footer) {
    padding: 8px 20px;
    background-color: var(--td-bg-color-container);
    border-top: 1px solid var(--td-component-border);
    flex-shrink: 0;
}

:deep(.action-buttons) {
    display: flex;
    gap: 12px;
    width: 100%;
    align-items: center;
}

:deep(.list-container-new) {
    background-color: var(--td-bg-color-container);
    padding: 4px;
    min-height: 200px;
    overflow-y: auto;
}

:deep(.list-container-new.history-container) {
    max-height: none;
    min-height: none;
    flex: 1;
}

:deep(.list-container-new.download-pane-container) {
    max-height: none;
    min-height: none;
    flex: 1;
    padding: 0;
    border: none;
    background: transparent;
}

:deep(.file-path-text) {
    font-family: monospace;
    font-size: 12px;
    word-break: break-all;
    color: var(--td-text-color-primary);
    margin-right: 8px;
}

:deep(.url-text) {
    font-family: monospace;
    font-size: 11px;
    color: var(--td-text-color-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 4px 8px;
}

:deep(.history-time) {
    font-weight: 600;
    font-size: 12px;
    color: var(--td-text-color-primary);
    margin-bottom: 4px;
}

:deep(.history-files-list) {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 4px;
}

:deep(.history-file-item) {
    font-size: 11px;
    color: var(--td-text-color-secondary);
    display: flex;
    align-items: center;
    gap: 4px;
    word-break: break-all;
}

/* Scrollbar styling */
:deep(.list-container-new::-webkit-scrollbar),
:deep(.pane-body::-webkit-scrollbar),
.sidebar-menu::-webkit-scrollbar {
    width: 6px;
    height: 6px;
}

:deep(.list-container-new::-webkit-scrollbar-thumb),
:deep(.pane-body::-webkit-scrollbar-thumb),
.sidebar-menu::-webkit-scrollbar-thumb {
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

    :deep(.pane-header) {
        padding: 12px 16px;
    }

    :deep(.pane-body) {
        padding: 16px;
    }

    :deep(.pane-footer) {
        padding: 12px 16px;
    }
}
</style>
