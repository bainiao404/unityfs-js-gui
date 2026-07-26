<template>
    <div class="tool-content-layout">
        <!-- Loading State -->
        <div v-if="loading" class="center-content">
            <t-loading size="large" text="正在解析 catalog 目录，请稍候..." />
        </div>

        <!-- Error State -->
        <div v-else-if="errorMsg" class="center-content padding-32">
            <t-alert theme="error" title="解析失败" :message="errorMsg" class="w-100 max-w-600">
                <template #operation>
                    <t-button variant="text" size="small" @click="resetAddressablesState">重试</t-button>
                </template>
            </t-alert>
        </div>

        <!-- Empty State / File Picker -->
        <div v-else-if="!parsedCatalog" class="center-content padding-32">
            <div
                class="upload-drop-zone"
                :class="{ 'is-dragover': isDragOver }"
                @dragover.prevent="onDragOver"
                @dragleave="onDragLeave"
                @drop.prevent="onDrop"
                @click="triggerFileSelect"
            >
                <input
                    type="file"
                    ref="fileInputRef"
                    accept=".json,.bin"
                    style="display: none"
                    @change="onFileSelected"
                />
                <div class="upload-icon-wrapper">
                    <file-add-icon class="upload-icon" />
                </div>
                <h3 class="upload-title">解析 Unity Addressables 目录</h3>
                <p class="upload-text">
                    点击选择 或将 <strong>catalog.json</strong> / <strong>catalog.bin</strong> 文件拖放到此处
                </p>
                <p class="upload-hint">支持 JSON 与 Binary 二进制文件格式的解析</p>
            </div>
        </div>

        <!-- Parser Result Display -->
        <div v-else class="parser-result-workspace">
            <!-- Top Details Header Bar -->
            <div class="result-header-bar">
                <div class="header-file-info">
                    <span class="file-icon-tag"><file-icon /></span>
                    <div class="file-details">
                        <div class="file-name text-ellipsis" :title="fileName">{{ fileName }}</div>
                        <div class="file-meta">
                            <span class="meta-item">大小: {{ fileSizeFormatted }}</span>
                            <span class="meta-item-divider">|</span>
                            <span class="meta-item">格式: {{ fileType.toUpperCase() }}</span>
                        </div>
                    </div>
                </div>

                <div class="header-action-buttons">
                    <t-button
                        variant="outline"
                        size="small"
                        theme="default"
                        @click="resetAddressablesState"
                        class="mr-8"
                    >
                        重新选择
                    </t-button>
                    <t-button theme="primary" size="small" @click="downloadParsedJson">
                        <template #icon><download-icon /></template>
                        下载 JSON
                    </t-button>
                </div>
            </div>

            <!-- Custom Navigation Tabs -->
            <div class="custom-tabs-header">
                <div
                    class="custom-tab-item"
                    :class="{ active: activeTab === 'summary' }"
                    @click="activeTab = 'summary'"
                >
                    数据概览
                </div>
                <div class="custom-tab-item" :class="{ active: activeTab === 'json' }" @click="activeTab = 'json'">
                    JSON 数据
                </div>
            </div>

            <!-- Tabs Content -->
            <div class="result-body-content">
                <!-- Tab 1: Summary -->
                <div v-show="activeTab === 'summary'" class="tab-scroll-container">
                    <!-- Stats Grid -->
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-num monospace-font">{{ totalResources }}</div>
                            <div class="stat-label">总资源数量 (Resources)</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-num monospace-font">{{ providerIdsCount }}</div>
                            <div class="stat-label">服务商数量 (Providers)</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-num monospace-font">{{ internalIdsCount }}</div>
                            <div class="stat-label">内部 ID 数量 (Internal IDs)</div>
                        </div>
                    </div>

                    <!-- Locator ID -->
                    <div class="section-card mt-16">
                        <h4 class="section-title">定位器 ID (Locator ID)</h4>
                        <div class="locator-id-box monospace-font">{{ parsedCatalog.LocatorId || '无' }}</div>
                    </div>

                    <!-- Bundle List Preview -->
                    <div class="section-card mt-16">
                        <h4 class="section-title">Bundle 资源列表预览 (最多展示前5个)</h4>
                        <div v-if="bundleList.length === 0" class="empty-list-hint">未找到 .bundle 格式的资源</div>
                        <div v-else class="bundle-list">
                            <div v-for="(bundle, idx) in bundleList" :key="idx" class="bundle-item">
                                <div class="bundle-name monospace-font" :title="bundle.name">{{ bundle.name }}</div>
                                <div class="bundle-meta">
                                    <span class="meta-tag"
                                        >CRC: <span class="tag-val monospace-font">{{ bundle.crc }}</span></span
                                    >
                                    <span class="meta-tag"
                                        >Hash: <span class="tag-val monospace-font">{{ bundle.hash }}</span></span
                                    >
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Tab 2: Interactive JSON View -->
                <div v-show="activeTab === 'json'" class="tab-scroll-container light-bg flex-col">
                    <div class="preview-warning-banner">
                        <t-alert
                            theme="info"
                            message="已将资源列表进行分页展示（每页 2000 个文件），右上角下载仍可获取完整无损数据。"
                        />
                        <div class="pagination-controls-row">
                            <span class="pagination-info-text">
                                共 {{ totalResourceKeys }} 个文件，分 {{ totalPages }} 页展示
                            </span>
                            <t-input
                                v-model="searchKeyword"
                                placeholder="搜索文件名..."
                                clearable
                                style="width: 240px; margin: 0 16px"
                            >
                                <template #suffix-icon>
                                    <search-icon />
                                </template>
                            </t-input>
                            <t-pagination
                                v-model:current="currentPage"
                                v-model:pageSize="pageSize"
                                :total="totalResourceKeys"
                                :show-page-size="false"
                                size="small"
                                :page-sizes="[2000]"
                            />
                        </div>
                    </div>
                    <div class="editor-flex-wrapper">
                        <json-viewer-monaco :data="previewCatalog" />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import { FileIcon, FileAddIcon, DownloadIcon, SearchIcon } from 'tdesign-icons-vue-next'
import JsonViewerMonaco from './JsonViewerMonaco.vue'
import { parse } from '@/assets/AddressablesToolsJs/src/index.js'

// DOM Ref
const fileInputRef = ref(null)

// UI States
const isDragOver = ref(false)
const loading = ref(false)
const errorMsg = ref('')
const activeTab = ref('summary')

// Parse Results
const parsedCatalog = ref(null)
const fileName = ref('')
const fileSize = ref(0)
const fileType = ref('') // 'json' or 'bin'

// Computed Values
const fileSizeFormatted = computed(() => {
    if (!fileSize.value) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(fileSize.value) / Math.log(k))
    return parseFloat((fileSize.value / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
})

const totalResources = computed(() => {
    if (!parsedCatalog.value || !parsedCatalog.value.Resources) return 0
    return Object.keys(parsedCatalog.value.Resources).length
})

const providerIdsCount = computed(() => {
    if (!parsedCatalog.value || !parsedCatalog.value.ProviderIds) return 0
    return parsedCatalog.value.ProviderIds.length
})

const internalIdsCount = computed(() => {
    if (!parsedCatalog.value || !parsedCatalog.value.InternalIds) return 0
    return parsedCatalog.value.InternalIds.length
})

const bundleList = computed(() => {
    if (!parsedCatalog.value || !parsedCatalog.value.Resources) return []
    const list = []
    let count = 0
    for (const [key, locs] of Object.entries(parsedCatalog.value.Resources)) {
        if (typeof key === 'string' && key.endsWith('.bundle')) {
            const res = locs[0]
            const data = res.Data?.Object || res.Data
            list.push({
                name: key,
                crc: data?.Crc ?? 'N/A',
                hash: data?.Hash ?? 'N/A',
            })
            count++
            if (count >= 5) break
        }
    }
    return list
})

const currentPage = ref(1)
const pageSize = ref(2000)
const searchKeyword = ref('')

watch(searchKeyword, () => {
    currentPage.value = 1
})

const resourceKeys = computed(() => {
    if (!parsedCatalog.value || !parsedCatalog.value.Resources) return []
    const keys = Object.keys(parsedCatalog.value.Resources)
    if (!searchKeyword.value.trim()) return keys
    const kw = searchKeyword.value.toLowerCase().trim()
    return keys.filter((key) => key.toLowerCase().includes(kw))
})

const totalResourceKeys = computed(() => resourceKeys.value.length)

const totalPages = computed(() => Math.ceil(totalResourceKeys.value / pageSize.value) || 1)

const previewCatalog = computed(() => {
    if (!parsedCatalog.value) return null
    const keys = resourceKeys.value
    if (keys.length === 0) return parsedCatalog.value

    const start = (currentPage.value - 1) * pageSize.value
    const end = start + pageSize.value
    const pageKeys = keys.slice(start, end)

    const paginatedResources = {}
    for (const key of pageKeys) {
        paginatedResources[key] = parsedCatalog.value.Resources[key]
    }

    return {
        LocatorId: parsedCatalog.value.LocatorId,
        PageInfo: {
            CurrentPage: currentPage.value,
            TotalPages: totalPages.value,
            TotalFiles: totalResourceKeys.value,
            PageSize: pageSize.value,
        },
        Resources: paginatedResources,
    }
})

// Trigger click
function triggerFileSelect() {
    fileInputRef.value?.click()
}

// Drag actions
function onDragOver(e) {
    isDragOver.value = true
}

function onDragLeave() {
    isDragOver.value = false
}

function onDrop(e) {
    isDragOver.value = false
    const files = e.dataTransfer?.files
    if (files && files.length > 0) {
        handleFile(files[0])
    }
}

function onFileSelected(e) {
    const files = e.target.files
    if (files && files.length > 0) {
        handleFile(files[0])
    }
    // reset input
    if (fileInputRef.value) {
        fileInputRef.value.value = ''
    }
}

function resetAddressablesState() {
    parsedCatalog.value = null
    fileName.value = ''
    fileSize.value = 0
    fileType.value = ''
    errorMsg.value = ''
    loading.value = false
    currentPage.value = 1
    searchKeyword.value = ''
}

// Handle parsing logic
function handleFile(file) {
    if (!file) return
    const name = file.name.toLowerCase()

    if (!name.endsWith('.json') && !name.endsWith('.bin')) {
        MessagePlugin.warning('请选择 .json 或 .bin 格式的文件')
        return
    }

    resetAddressablesState()
    loading.value = true
    fileName.value = file.name
    fileSize.value = file.size
    fileType.value = name.endsWith('.json') ? 'json' : 'bin'

    const reader = new FileReader()

    reader.onerror = () => {
        loading.value = false
        errorMsg.value = '文件读取出错'
        MessagePlugin.error('文件读取失败')
    }

    if (fileType.value === 'json') {
        reader.onload = () => {
            try {
                const catalog = parse(reader.result)
                parsedCatalog.value = catalog
                MessagePlugin.success('解析成功')
            } catch (err) {
                console.error(err)
                errorMsg.value = err.message || 'JSON 解析出错'
                MessagePlugin.error('解析失败')
            } finally {
                loading.value = false
            }
        }
        reader.readAsText(file, 'utf-8')
    } else {
        reader.onload = () => {
            try {
                const catalog = parse(reader.result)
                parsedCatalog.value = catalog
                MessagePlugin.success('解析成功')
            } catch (err) {
                console.error(err)
                errorMsg.value = err.message || '二进制解析出错'
                MessagePlugin.error('解析失败')
            } finally {
                loading.value = false
            }
        }
        reader.readAsArrayBuffer(file)
    }
}

// Download output as JSON
function downloadParsedJson() {
    if (!parsedCatalog.value) return

    const jsonString = JSON.stringify(
        parsedCatalog.value,
        (key, value) => {
            if (key === 'Dependencies' && Array.isArray(value)) {
                return value.map((dep) => {
                    if (dep && typeof dep === 'object') {
                        return { PrimaryKey: dep.PrimaryKey }
                    }
                    return dep
                })
            }
            return value
        },
        2,
    )

    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url

    const baseName = fileName.value.substring(0, fileName.value.lastIndexOf('.')) || fileName.value
    link.download = `${baseName}_parsed.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    MessagePlugin.success('下载已启动')
}
</script>

<style scoped>
.tool-content-layout {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    position: relative;
    box-sizing: border-box;
}

.center-content {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}

/* Upload Drop Zone */
.upload-drop-zone {
    width: 100%;
    max-width: 560px;
    border: 2px dashed var(--td-component-border);
    border-radius: 12px;
    padding: 48px 24px;
    text-align: center;
    background-color: var(--td-bg-color-container);
    cursor: pointer;
    transition: all 0.2s ease;
    box-sizing: border-box;
}

.upload-drop-zone:hover,
.upload-drop-zone.is-dragover {
    border-color: var(--td-brand-color);
    background-color: var(--td-bg-color-container-hover);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.upload-icon-wrapper {
    display: flex;
    justify-content: center;
    margin-bottom: 16px;
}

.upload-icon {
    font-size: 48px;
    color: var(--td-brand-color);
}

.upload-title {
    margin: 0 0 8px 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--td-text-color-primary);
}

.upload-text {
    font-size: 13px;
    color: var(--td-text-color-secondary);
    margin: 0 0 12px 0;
}

.upload-hint {
    font-size: 11px;
    color: var(--td-text-color-placeholder);
    margin: 0;
}

/* Parser Results Layout */
.parser-result-workspace {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    overflow: hidden;
}

.result-header-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    background-color: var(--td-bg-color-container);
    border-bottom: 1px solid var(--td-component-border);
    flex-shrink: 0;
}

.header-file-info {
    display: flex;
    align-items: center;
    gap: 12px;
}

.file-icon-tag {
    font-size: 24px;
    color: var(--td-brand-color);
    background-color: var(--td-brand-color-light);
    width: 40px;
    height: 40px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.file-details {
    display: flex;
    flex-direction: column;
}

.file-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--td-text-color-primary);
    max-width: 320px;
}

.file-meta {
    font-size: 11px;
    color: var(--td-text-color-placeholder);
    display: flex;
    gap: 8px;
    margin-top: 2px;
}

.meta-item-divider {
    color: var(--td-component-border);
}

.header-action-buttons {
    display: flex;
    align-items: center;
}

.mr-8 {
    margin-right: 8px;
}

.custom-tabs-header {
    display: flex;
    border-bottom: 1px solid var(--td-component-border);
    background-color: var(--td-bg-color-container);
    padding: 0 20px;
    gap: 24px;
    flex-shrink: 0;
}

.custom-tab-item {
    padding: 12px 4px;
    font-size: 14px;
    cursor: pointer;
    color: var(--td-text-color-secondary);
    border-bottom: 2px solid transparent;
    transition: all 0.2s ease;
    font-weight: 500;
}

.custom-tab-item:hover {
    color: var(--td-brand-color);
}

.custom-tab-item.active {
    color: var(--td-brand-color);
    border-bottom-color: var(--td-brand-color);
    font-weight: 600;
}

.result-body-content {
    flex: 1;
    position: relative;
    overflow: hidden;
}

.tab-scroll-container {
    height: 100%;
    overflow-y: auto;
    padding: 20px;
    box-sizing: border-box;
}

.tab-scroll-container.light-bg {
    background-color: #ffffff;
    padding: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.flex-col {
    display: flex;
    flex-direction: column;
}

.preview-warning-banner {
    padding: 16px 16px 0 16px;
    flex-shrink: 0;
}

.pagination-controls-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 12px;
    background-color: var(--td-bg-color-container);
    padding: 8px 16px;
    border: 1px solid var(--td-component-border);
    border-radius: 6px;
}

.pagination-info-text {
    font-size: 13px;
    color: var(--td-text-color-secondary);
    font-weight: 500;
}

.editor-flex-wrapper {
    position: relative;
    flex: 1;
    min-height: 0;
    box-sizing: border-box;
}

/* Stats Dashboard Grid */
.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 16px;
    margin-bottom: 16px;
}

.stat-card {
    background-color: var(--td-bg-color-container);
    border: 1px solid var(--td-component-border);
    border-radius: 8px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.stat-num {
    font-size: 24px;
    font-weight: 700;
    color: var(--td-brand-color);
}

.stat-label {
    font-size: 12px;
    color: var(--td-text-color-secondary);
    margin-top: 4px;
}

/* Section Card */
.section-card {
    background-color: var(--td-bg-color-container);
    border: 1px solid var(--td-component-border);
    border-radius: 8px;
    padding: 16px;
}

.section-title {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--td-text-color-primary);
}

.locator-id-box {
    background-color: var(--td-bg-color-page);
    border: 1px solid var(--td-component-border);
    border-radius: 4px;
    padding: 8px 12px;
    font-size: 13px;
    color: var(--td-text-color-primary);
    word-break: break-all;
}

/* Bundle List Preview */
.bundle-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.bundle-item {
    background-color: var(--td-bg-color-page);
    border: 1px solid var(--td-component-border);
    border-radius: 6px;
    padding: 10px 12px;
}

.bundle-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--td-text-color-primary);
    margin-bottom: 6px;
    word-break: break-all;
}

.bundle-meta {
    display: flex;
    gap: 16px;
    font-size: 11px;
}

.meta-tag {
    color: var(--td-text-color-secondary);
}

.tag-val {
    color: var(--td-text-color-primary);
    font-weight: 600;
}

.empty-list-hint {
    font-size: 12px;
    color: var(--td-text-color-placeholder);
    text-align: center;
    padding: 16px;
}

/* Helpers */
.mt-16 {
    margin-top: 16px;
}

.w-100 {
    width: 100%;
}

.h-100 {
    height: 100%;
}

.max-w-600 {
    max-width: 600px;
}

.padding-32 {
    padding: 32px;
}

.monospace-font {
    font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
}

.text-ellipsis {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* JSON Viewer Theme Customization */
.light-json {
    padding: 16px;
    --background-color: #ffffff;
    --color: #24292f;
    --font-family: ui-monospace, monospace;
    --font-size: 13px;
    --indent-size: 1.5em;
    --indentguide-color: #eee;
    --property-color: #0550ae;
    --string-color: #0a3069;
    --number-color: #cf222e;
    --boolean-color: #116329;
    --null-color: #6e7781;
    --preview-color: #6e7781;
}
</style>
