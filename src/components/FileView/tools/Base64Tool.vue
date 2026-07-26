<template>
    <div class="tool-content-layout">
        <div class="tool-header-bar">
            <h3 class="tool-title">Base64 转换工具</h3>
        </div>

        <div class="tool-body-tabs">
            <t-tabs v-model="activeTab" class="w-100 h-100">
                <!-- Tab 1: Text Base64 -->
                <t-tab-panel value="text" label="文本 Base64">
                    <div class="tab-scroll-container">
                        <div class="text-tool-grid">
                            <!-- Left: Input -->
                            <div class="io-panel">
                                <div class="panel-header">
                                    <span class="panel-title">输入文本</span>
                                    <t-button size="small" variant="text" theme="default" @click="inputText = ''"
                                        >清空</t-button
                                    >
                                </div>
                                <t-textarea
                                    v-model="inputText"
                                    placeholder="请输入想要编码或解码的文本..."
                                    :rows="8"
                                    class="io-textarea monospace-font"
                                />
                            </div>

                            <!-- Middle: Actions -->
                            <div class="actions-panel">
                                <div class="options-box">
                                    <t-checkbox v-model="urlSafe">URL 安全模式 (URL-Safe)</t-checkbox>
                                </div>
                                <div class="buttons-box">
                                    <t-button block theme="primary" @click="encodeText">
                                        Base64 编码 <template #icon><chevron-right-icon /></template>
                                    </t-button>
                                    <t-button block theme="warning" @click="decodeText" class="mt-8">
                                        Base64 解码 <template #icon><chevron-left-icon /></template>
                                    </t-button>
                                </div>
                            </div>

                            <!-- Right: Output -->
                            <div class="io-panel">
                                <div class="panel-header">
                                    <span class="panel-title">输出结果</span>
                                    <t-button
                                        size="small"
                                        variant="text"
                                        theme="primary"
                                        @click="copyToClipboard(outputText)"
                                        >复制结果</t-button
                                    >
                                </div>
                                <t-textarea
                                    v-model="outputText"
                                    placeholder="转换结果将在此显示..."
                                    :rows="8"
                                    readonly
                                    class="io-textarea monospace-font"
                                />
                            </div>
                        </div>
                    </div>
                </t-tab-panel>

                <!-- Tab 2: File Base64 -->
                <t-tab-panel value="file" label="文件 Base64">
                    <div class="tab-scroll-container">
                        <div class="file-tool-container">
                            <div class="file-split-grid">
                                <!-- Left: File to Base64 -->
                                <div class="file-card-box">
                                    <h4 class="card-box-title">文件转 Base64</h4>
                                    <div
                                        class="file-drop-zone-small"
                                        :class="{ 'is-dragover': isDragOver }"
                                        @dragover.prevent="isDragOver = true"
                                        @dragleave="isDragOver = false"
                                        @drop.prevent="onFileDrop"
                                        @click="triggerFileSelect"
                                    >
                                        <input
                                            type="file"
                                            ref="fileInputRef"
                                            style="display: none"
                                            @change="onFileSelected"
                                        />
                                        <file-add-icon class="drop-icon" />
                                        <div class="drop-text">点击或拖入任意文件</div>
                                    </div>

                                    <div v-if="selectedFileName" class="file-info-row mt-8">
                                        <span class="file-info-name text-ellipsis" :title="selectedFileName">{{
                                            selectedFileName
                                        }}</span>
                                        <span class="file-info-size monospace-font">({{ selectedFileSize }})</span>
                                    </div>

                                    <div class="mt-12">
                                        <t-checkbox v-model="includeDataUri">包含 Data URI 前缀</t-checkbox>
                                    </div>

                                    <div class="mt-12">
                                        <t-button
                                            block
                                            theme="primary"
                                            :disabled="!fileBase64"
                                            @click="copyToClipboard(fileBase64)"
                                        >
                                            复制 Base64 编码
                                        </t-button>
                                    </div>
                                    <t-textarea
                                        v-model="fileBase64"
                                        placeholder="文件 Base64 编码结果将显示在此..."
                                        :rows="4"
                                        readonly
                                        class="io-textarea monospace-font mt-8"
                                    />
                                </div>

                                <!-- Right: Base64 to File -->
                                <div class="file-card-box">
                                    <h4 class="card-box-title">Base64 转文件</h4>
                                    <t-textarea
                                        v-model="inputBase64"
                                        placeholder="请在此粘贴 Base64 字符串..."
                                        :rows="5"
                                        class="io-textarea monospace-font"
                                    />
                                    <div class="input-row mt-12">
                                        <t-input v-model="outputFileName" placeholder="保存文件名，例如: file.bin" />
                                    </div>
                                    <div class="mt-12">
                                        <t-button
                                            block
                                            theme="warning"
                                            :disabled="!inputBase64"
                                            @click="downloadBase64AsFile"
                                        >
                                            还原并下载文件
                                        </t-button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </t-tab-panel>
            </t-tabs>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import { FileAddIcon, ChevronRightIcon, ChevronLeftIcon } from 'tdesign-icons-vue-next'
import CryptoJS from 'crypto-js'

// Navigation Tab
const activeTab = ref('text')

// Text Conversion states
const inputText = ref('')
const outputText = ref('')
const urlSafe = ref(false)

// File -> Base64 states
const fileInputRef = ref(null)
const isDragOver = ref(false)
const selectedFileName = ref('')
const selectedFileSize = ref('')
const selectedFileType = ref('')
const fileBase64 = ref('')
const includeDataUri = ref(true)

// Base64 -> File states
const inputBase64 = ref('')
const outputFileName = ref('decoded_file.bin')

// Text Base64 conversions
function encodeText() {
    if (!inputText.value) {
        MessagePlugin.warning('请输入要编码的文本')
        return
    }
    try {
        // Convert UTF-8 text to WordArray, then to Base64
        const words = CryptoJS.enc.Utf8.parse(inputText.value)
        let base64 = CryptoJS.enc.Base64.stringify(words)

        if (urlSafe.value) {
            base64 = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
        }
        outputText.value = base64
        MessagePlugin.success('编码成功')
    } catch (e) {
        MessagePlugin.error('编码出错: ' + e.message)
    }
}

function decodeText() {
    if (!inputText.value) {
        MessagePlugin.warning('请输入要解码的 Base64')
        return
    }
    try {
        let base64 = inputText.value.trim()
        if (urlSafe.value) {
            // Restore standard Base64 characters
            base64 = base64.replace(/-/g, '+').replace(/_/g, '/')
            // Add padding if missing
            while (base64.length % 4) {
                base64 += '='
            }
        }
        const parsedWords = CryptoJS.enc.Base64.parse(base64)
        const utf8Text = CryptoJS.enc.Utf8.stringify(parsedWords)
        outputText.value = utf8Text
        MessagePlugin.success('解码成功')
    } catch (e) {
        MessagePlugin.error('解码失败，请确认输入的是合法的 Base64 字符串')
    }
}

// File Base64 actions
function triggerFileSelect() {
    fileInputRef.value?.click()
}

function onFileSelected(e) {
    const files = e.target.files
    if (files && files.length > 0) {
        processFile(files[0])
    }
}

function onFileDrop(e) {
    isDragOver.value = false
    const files = e.dataTransfer?.files
    if (files && files.length > 0) {
        processFile(files[0])
    }
}

function processFile(file) {
    selectedFileName.value = file.name
    selectedFileType.value = file.type || 'application/octet-stream'

    // Format size
    const size = file.size
    if (size < 1024) selectedFileSize.value = size + ' B'
    else if (size < 1048576) selectedFileSize.value = (size / 1024).toFixed(2) + ' KB'
    else selectedFileSize.value = (size / 1048576).toFixed(2) + ' MB'

    const reader = new FileReader()
    reader.onload = (e) => {
        let result = e.target.result
        // Result is a DataURL: data:*/*;base64,.....
        const commaIdx = result.indexOf(',')
        if (commaIdx !== -1) {
            const base64Str = result.substring(commaIdx + 1)
            const prefix = result.substring(0, commaIdx + 1)
            fileBase64.value = includeDataUri.value ? prefix + base64Str : base64Str
        } else {
            fileBase64.value = result
        }
        MessagePlugin.success('文件读取及 Base64 转换完成')
    }
    reader.readAsDataURL(file)
}

function downloadBase64AsFile() {
    if (!inputBase64.value) return
    try {
        let base64 = inputBase64.value.trim()
        // Strip data URI prefix if present
        const commaIdx = base64.indexOf(',')
        if (commaIdx !== -1) {
            base64 = base64.substring(commaIdx + 1)
        }

        // Decode base64 to binary bytes
        const binaryStr = atob(base64)
        const len = binaryStr.length
        const bytes = new Uint8Array(len)
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryStr.charCodeAt(i)
        }

        const blob = new Blob([bytes], { type: 'application/octet-stream' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = outputFileName.value || 'decoded_file.bin'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        MessagePlugin.success('文件下载成功')
    } catch (e) {
        MessagePlugin.error('解码 Base64 并还原文件失败: ' + e.message)
    }
}

// Clipboard copy helper
function copyToClipboard(text) {
    if (!text) {
        MessagePlugin.warning('没有内容可复制')
        return
    }
    navigator.clipboard
        .writeText(text)
        .then(() => {
            MessagePlugin.success('已复制到剪贴板')
        })
        .catch((err) => {
            MessagePlugin.error('复制失败')
        })
}
</script>

<style scoped>
.tool-content-layout {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    overflow: hidden;
}

.tool-header-bar {
    padding: 16px 20px;
    background-color: var(--td-bg-color-container);
    border-bottom: 1px solid var(--td-component-border);
    flex-shrink: 0;
}

.tool-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--td-text-color-primary);
}

.tool-body-tabs {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
}

.tool-body-tabs :deep(.t-tabs) {
    display: flex;
    flex-direction: column;
}

.tool-body-tabs :deep(.t-tabs__content) {
    flex: 1;
    position: relative;
    overflow: hidden;
}

.tool-body-tabs :deep(.t-tab-panel) {
    position: absolute;
    inset: 0;
    height: 100%;
    width: 100%;
}

.tab-scroll-container {
    height: 100%;
    overflow-y: auto;
    padding: 20px;
    box-sizing: border-box;
}

/* Text base64 layout */
.text-tool-grid {
    display: grid;
    grid-template-columns: 1fr 180px 1fr;
    gap: 20px;
    align-items: center;
    min-height: 100%;
}

.io-panel {
    display: flex;
    flex-direction: column;
    gap: 8px;
    height: 100%;
}

.panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.panel-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--td-text-color-secondary);
}

.io-textarea :deep(textarea) {
    font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
    font-size: 13px;
    line-height: 1.5;
}

.actions-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
    justify-content: center;
    padding: 24px 0;
}

.options-box {
    width: 100%;
}

.buttons-box {
    width: 100%;
}

/* File tool layout */
.file-tool-container {
    min-height: 100%;
}

.file-split-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    min-height: 100%;
}

.file-card-box {
    background-color: var(--td-bg-color-container);
    border: 1px solid var(--td-component-border);
    border-radius: 8px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
}

.card-box-title {
    margin: 0 0 16px 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--td-text-color-primary);
    border-bottom: 1px solid var(--td-component-border);
    padding-bottom: 8px;
}

.file-drop-zone-small {
    border: 2px dashed var(--td-component-border);
    border-radius: 8px;
    padding: 32px 16px;
    text-align: center;
    cursor: pointer;
    background-color: var(--td-bg-color-page);
    transition: all 0.2s ease;
}

.file-drop-zone-small:hover,
.file-drop-zone-small.is-dragover {
    border-color: var(--td-brand-color);
    background-color: var(--td-bg-color-container-hover);
}

.drop-icon {
    font-size: 32px;
    color: var(--td-brand-color);
    margin-bottom: 8px;
}

.drop-text {
    font-size: 13px;
    color: var(--td-text-color-primary);
}

.file-info-row {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
}

.file-info-name {
    color: var(--td-text-color-primary);
    font-weight: 600;
    max-width: 200px;
}

.file-info-size {
    color: var(--td-text-color-placeholder);
}

.input-row {
    width: 100%;
}

/* Helpers */
.mt-8 {
    margin-top: 8px;
}

.mt-12 {
    margin-top: 12px;
}

.w-100 {
    width: 100%;
}

.h-100 {
    height: 100%;
}

.monospace-font {
    font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
}

.text-ellipsis {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
</style>
