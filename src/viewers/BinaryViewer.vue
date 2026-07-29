<template>
    <div class="binary-viewer-container">
        <!-- Header Info & Toolbar -->
        <div class="viewer-header">
            <div class="meta-section">
                <h3 class="title" :title="objectName">{{ objectName || 'Loading Asset...' }}</h3>
                <div class="meta-badges">
                    <span class="badge badge-class">{{ objectClass || 'Unknown Class' }}</span>
                    <span class="badge badge-size">{{ formattedSize }}</span>
                </div>
            </div>

            <!-- Toolbar Controls -->
            <div class="toolbar">
                <!-- Jump Offset -->
                <div class="tool-group">
                    <t-input
                        v-model="jumpOffsetInput"
                        placeholder="跳转偏移量 (如: 0x100 或 256)"
                        size="small"
                        style="width: 190px"
                        @enter="jumpToOffset"
                    >
                        <template #suffix>
                            <t-button size="small" variant="text" @click="jumpToOffset" class="tool-btn">Go</t-button>
                        </template>
                    </t-input>
                </div>

                <!-- Search -->
                <div class="tool-group search-group">
                    <t-select
                        v-model="searchType"
                        size="small"
                        style="width: 75px"
                        :bordered="false"
                        class="search-select"
                    >
                        <t-option value="text" label="文本" />
                        <t-option value="hex" label="十六进制" />
                    </t-select>
                    <t-input
                        v-model="searchInput"
                        placeholder="查找内容..."
                        size="small"
                        style="width: 170px"
                        @enter="performSearch"
                    >
                        <template #suffix>
                            <t-button size="small" variant="text" @click="performSearch" class="tool-btn"
                                >Find</t-button
                            >
                        </template>
                    </t-input>
                </div>
            </div>
        </div>

        <!-- Main Viewer Split Panel -->
        <div class="viewer-body">
            <!-- Left Panel: Hex Grid -->
            <div class="hex-panel-wrapper">
                <!-- Column Labels Header -->
                <div class="hex-header-row monospace">
                    <div class="cell offset-col">Offset</div>
                    <div class="hex-cols">
                        <span
                            v-for="i in 16"
                            :key="i"
                            class="cell hex-cell-header"
                            :class="{ 'group-divider-col': i === 8 }"
                        >
                            {{ (i - 1).toString(16).toUpperCase().padStart(2, '0') }}
                        </span>
                    </div>
                    <div class="ascii-cols-header">Decoded Text</div>
                </div>

                <!-- Hex Rows -->
                <div class="hex-rows-container monospace">
                    <div v-for="(row, rIdx) in hexRows" :key="rIdx" class="hex-row">
                        <!-- Offset value -->
                        <div class="cell offset-col">{{ row.offsetHex }}</div>

                        <!-- Hex cells -->
                        <div class="hex-cols">
                            <span
                                v-for="(byte, bIdx) in row.bytes"
                                :key="bIdx"
                                class="cell hex-byte-cell"
                                :class="{
                                    'group-divider-col': bIdx === 7,
                                    'is-selected': selectedByteIndex === byte.index,
                                    'is-hovered': hoveredByteIndex === byte.index,
                                }"
                                @mouseenter="hoveredByteIndex = byte.index"
                                @mouseleave="hoveredByteIndex = null"
                                @click="selectedByteIndex = byte.index"
                            >
                                {{ byte.value.toString(16).toUpperCase().padStart(2, '0') }}
                            </span>
                            <!-- Placeholders for trailing bytes in final row -->
                            <span
                                v-for="placeholder in 16 - row.bytes.length"
                                :key="'p-' + placeholder"
                                class="cell hex-byte-cell placeholder"
                                :class="{ 'group-divider-col': row.bytes.length + placeholder - 1 === 7 }"
                            >
                                --
                            </span>
                        </div>

                        <!-- ASCII Character representations -->
                        <div class="ascii-cols">
                            <span
                                v-for="(byte, bIdx) in row.bytes"
                                :key="bIdx"
                                class="cell ascii-char-cell"
                                :class="{
                                    'group-divider-col': bIdx === 7,
                                    'is-selected': selectedByteIndex === byte.index,
                                    'is-hovered': hoveredByteIndex === byte.index,
                                }"
                                @mouseenter="hoveredByteIndex = byte.index"
                                @mouseleave="hoveredByteIndex = null"
                                @click="selectedByteIndex = byte.index"
                            >
                                {{ getPrintableChar(byte.value) }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Right Panel: Data Interpreter Inspector -->
            <div class="inspector-panel">
                <div class="inspector-title">数据解析器</div>
                <div class="inspector-body" v-if="inspectorValues">
                    <div class="inspector-row">
                        <span class="label">起始偏移量</span>
                        <span class="val monospace"
                            >0x{{ inspectorValues.hexOffset }} ({{ inspectorValues.offset }} B)</span
                        >
                    </div>
                    <div class="inspector-row">
                        <span class="label">二进制 (Binary)</span>
                        <span class="val monospace">{{ inspectorValues.bin }}</span>
                    </div>
                    <div class="inspector-row">
                        <span class="label">八进制 (Octal)</span>
                        <span class="val monospace">{{ inspectorValues.oct }}</span>
                    </div>

                    <div class="divider"></div>

                    <div class="inspector-row">
                        <span class="label">有符号 Int8</span>
                        <span class="val monospace">{{ inspectorValues.i8 }}</span>
                    </div>
                    <div class="inspector-row">
                        <span class="label">无符号 Uint8</span>
                        <span class="val monospace">{{ inspectorValues.u8 }}</span>
                    </div>
                    <div class="inspector-row">
                        <span class="label">有符号 Int16 (LE)</span>
                        <span class="val monospace">{{
                            inspectorValues.i16 !== null ? inspectorValues.i16 : '--'
                        }}</span>
                    </div>
                    <div class="inspector-row">
                        <span class="label">无符号 Uint16 (LE)</span>
                        <span class="val monospace">{{
                            inspectorValues.u16 !== null ? inspectorValues.u16 : '--'
                        }}</span>
                    </div>
                    <div class="inspector-row">
                        <span class="label">有符号 Int32 (LE)</span>
                        <span class="val monospace">{{
                            inspectorValues.i32 !== null ? inspectorValues.i32 : '--'
                        }}</span>
                    </div>
                    <div class="inspector-row">
                        <span class="label">无符号 Uint32 (LE)</span>
                        <span class="val monospace">{{
                            inspectorValues.u32 !== null ? inspectorValues.u32 : '--'
                        }}</span>
                    </div>
                    <div class="inspector-row">
                        <span class="label">单精度 Float32 (LE)</span>
                        <span class="val monospace">{{
                            inspectorValues.f32 !== null ? inspectorValues.f32 : '--'
                        }}</span>
                    </div>
                    <div class="inspector-row">
                        <span class="label">双精度 Float64 (LE)</span>
                        <span class="val monospace">{{
                            inspectorValues.f64 !== null ? inspectorValues.f64 : '--'
                        }}</span>
                    </div>
                    <div class="inspector-row">
                        <span class="label">字符 (ASCII/UTF8)</span>
                        <span class="val monospace">" {{ inspectorValues.char }} "</span>
                    </div>
                </div>
                <div class="inspector-empty" v-else>在左侧的网格中选择任意字节以查看其数据解析格式</div>
            </div>
        </div>

        <!-- Footer Pagination Controls -->
        <div class="viewer-footer">
            <div class="page-controls">
                <t-button size="small" variant="outline" :disabled="currentPage <= 1" @click="currentPage--"
                    >上一页</t-button
                >
                <span class="page-info">第 {{ currentPage }} / {{ totalPages }} 页</span>
                <t-button size="small" variant="outline" :disabled="currentPage >= totalPages" @click="currentPage++"
                    >下一页</t-button
                >
            </div>

            <div class="page-size-selector">
                <span class="label">每页大小:</span>
                <t-select v-model="pageSize" size="small" style="width: 100px" @change="onPageSizeChange">
                    <t-option :value="256" label="256 字节" />
                    <t-option :value="512" label="512 字节" />
                    <t-option :value="1024" label="1 KB" />
                    <t-option :value="2048" label="2 KB" />
                    <t-option :value="4096" label="4 KB" />
                </t-select>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { UnityFSGui } from '@/assets/unityfs-gui'
import { MessagePlugin } from 'tdesign-vue-next'

const props = defineProps({
    assetManagerId: { type: [String, Number], required: true },
    objectId: { type: [String, Number], required: true },
})

const objectName = ref('')
const objectClass = ref('')
const objectSize = ref(0)
const binaryData = ref(null)

const currentPage = ref(1)
const pageSize = ref(512)
const jumpOffsetInput = ref('')
const searchInput = ref('')
const searchType = ref('text')

const selectedByteIndex = ref(null)
const hoveredByteIndex = ref(null)

const formattedSize = computed(() => {
    if (!objectSize.value) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(objectSize.value) / Math.log(k))
    return parseFloat((objectSize.value / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
})

const totalPages = computed(() => {
    if (!objectSize.value) return 1
    return Math.ceil(objectSize.value / pageSize.value)
})

// Current page's bytes array
const pageBytes = computed(() => {
    if (!binaryData.value) return []
    const start = (currentPage.value - 1) * pageSize.value
    const end = Math.min(start + pageSize.value, objectSize.value)
    const bytes = []
    for (let i = start; i < end; i++) {
        bytes.push({
            index: i,
            pageIndex: i - start,
            value: binaryData.value[i],
        })
    }
    return bytes
})

// Group page bytes into rows of 16
const hexRows = computed(() => {
    const rows = []
    const bytes = pageBytes.value
    for (let i = 0; i < bytes.length; i += 16) {
        const rowBytes = bytes.slice(i, i + 16)
        const startOffset = (currentPage.value - 1) * pageSize.value + i
        rows.push({
            offsetHex: startOffset.toString(16).toUpperCase().padStart(8, '0'),
            bytes: rowBytes,
        })
    }
    return rows
})

// Data inspector values computed from selection
const inspectorValues = computed(() => {
    if (selectedByteIndex.value === null || !binaryData.value) return null
    const idx = selectedByteIndex.value
    const data = binaryData.value

    // Safety inspect buffer setup
    const inspectBuffer = new ArrayBuffer(8)
    const inspectView = new Uint8Array(inspectBuffer)
    const len = Math.min(8, data.length - idx)
    for (let i = 0; i < len; i++) {
        inspectView[i] = data[idx + i]
    }
    const dv = new DataView(inspectBuffer)

    const u8 = data[idx]
    const i8 = u8 > 127 ? u8 - 256 : u8
    const bin = u8.toString(2).padStart(8, '0')
    const oct = u8.toString(8).padStart(3, '0')

    let u16 = null,
        i16 = null
    let u32 = null,
        i32 = null
    let f32 = null,
        f64 = null

    try {
        if (len >= 2) {
            u16 = dv.getUint16(0, true)
            i16 = dv.getInt16(0, true)
        }
        if (len >= 4) {
            u32 = dv.getUint32(0, true)
            i32 = dv.getInt32(0, true)
            f32 = dv.getFloat32(0, true)
        }
        if (len >= 8) {
            f64 = dv.getFloat64(0, true)
        }
    } catch (e) {}

    let char = '.'
    if (u8 >= 32 && u8 <= 126) {
        char = String.fromCharCode(u8)
    }

    return {
        offset: idx,
        hexOffset: idx.toString(16).toUpperCase().padStart(8, '0'),
        bin,
        oct,
        u8,
        i8,
        u16,
        i16,
        u32,
        i32,
        f32: f32 !== null ? f32.toPrecision(6) : null,
        f64: f64 !== null ? f64.toPrecision(10) : null,
        char,
    }
})

function getPrintableChar(val) {
    return val >= 32 && val <= 126 ? String.fromCharCode(val) : '.'
}

function onPageSizeChange() {
    currentPage.value = 1
    selectedByteIndex.value = null
}

async function start() {
    try {
        const assetManager = await UnityFSGui.assetManagers.get(props.assetManagerId)
        const object = assetManager.getObjectInfos()?.[props.objectId]

        if (!object) throw new Error('未找到资源对象')

        objectName.value = object.name || 'Unnamed Asset'
        objectClass.value = object.className || 'Unknown'
        objectSize.value = object.size || 0

        // Read raw binary from the reader reference
        const reader = object._reader
        if (!reader) throw new Error('读取器未就绪')

        const currentOffset = reader.offset
        reader.seek(object.offset)
        binaryData.value = reader.read(object.size)
        reader.seek(currentOffset) // Restore offset
    } catch (err) {
        console.error('Binary load error:', err)
        MessagePlugin.error('加载二进制数据失败: ' + err.message)
    }
}

function jumpToOffset() {
    if (!jumpOffsetInput.value || !binaryData.value) return
    let offset = 0
    const rawVal = jumpOffsetInput.value.trim()
    if (rawVal.toLowerCase().startsWith('0x')) {
        offset = parseInt(rawVal.slice(2), 16)
    } else if (/^[0-9a-fA-F]+$/.test(rawVal) && rawVal.length > 5) {
        offset = parseInt(rawVal, 16)
    } else {
        offset = parseInt(rawVal, 10)
    }

    if (isNaN(offset) || offset < 0 || offset >= objectSize.value) {
        MessagePlugin.warning(`无效偏移量，合法的偏移量范围是 0 - ${objectSize.value - 1}`)
        return
    }

    selectedByteIndex.value = offset
    const targetPage = Math.floor(offset / pageSize.value) + 1
    currentPage.value = targetPage
    MessagePlugin.success(`已跳转到偏移量: 0x${offset.toString(16).toUpperCase()}`)
}

function performSearch() {
    if (!searchInput.value || !binaryData.value) return
    let searchPattern = []

    if (searchType.value === 'text') {
        const encoder = new TextEncoder()
        searchPattern = Array.from(encoder.encode(searchInput.value))
    } else {
        const hex = searchInput.value.replace(/\s+/g, '')
        if (hex.length % 2 !== 0) {
            MessagePlugin.warning('Hex 搜索内容必须是偶数长度')
            return
        }
        for (let i = 0; i < hex.length; i += 2) {
            searchPattern.push(parseInt(hex.slice(i, i + 2), 16))
        }
    }

    const data = binaryData.value
    const patLen = searchPattern.length
    if (patLen === 0) return

    let foundIndex = -1
    const startIdx =
        selectedByteIndex.value !== null ? selectedByteIndex.value + 1 : (currentPage.value - 1) * pageSize.value

    for (let i = startIdx; i <= data.length - patLen; i++) {
        let match = true
        for (let j = 0; j < patLen; j++) {
            if (data[i + j] !== searchPattern[j]) {
                match = false
                break
            }
        }
        if (match) {
            foundIndex = i
            break
        }
    }

    // Wrap around search from start
    if (foundIndex === -1 && startIdx > 0) {
        for (let i = 0; i <= startIdx - patLen; i++) {
            let match = true
            for (let j = 0; j < patLen; j++) {
                if (data[i + j] !== searchPattern[j]) {
                    match = false
                    break
                }
            }
            if (match) {
                foundIndex = i
                break
            }
        }
    }

    if (foundIndex !== -1) {
        selectedByteIndex.value = foundIndex
        const targetPage = Math.floor(foundIndex / pageSize.value) + 1
        currentPage.value = targetPage
        MessagePlugin.success(`找到匹配项，偏移量: 0x${foundIndex.toString(16).toUpperCase()}`)
    } else {
        MessagePlugin.warning('未找到匹配项')
    }
}

onMounted(start)
</script>

<style scoped>
.binary-viewer-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: #ffffff;
    box-sizing: border-box;
    color: #1e293b;
}

/* Header & Toolbar Styles */
.viewer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid #e2e8f0;
    background-color: #f8fafc;
    flex-wrap: wrap;
    gap: 12px;
}

.meta-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.meta-section .title {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: #0f172a;
    max-width: 320px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.meta-badges {
    display: flex;
    gap: 6px;
}

.badge {
    padding: 2px 6px;
    font-size: 10px;
    font-weight: 500;
    border-radius: 4px;
}

.badge-class {
    background-color: #e0f2fe;
    color: #0369a1;
}

.badge-size {
    background-color: #f1f5f9;
    color: #475569;
}

.toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
}

.tool-group {
    display: flex;
    align-items: center;
}

.search-group {
    border: 1px solid #d1d5db;
    border-radius: 6px;
    overflow: hidden;
    background-color: #ffffff;
}

.search-group :deep(.t-input) {
    border: none !important;
}

.search-select :deep(.t-input) {
    background-color: #f1f5f9;
    border: none;
    font-size: 11px;
}

.tool-btn {
    font-size: 11px;
    color: #0052d9;
}

/* Monospace Helpers */
.monospace {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
    font-size: 12px;
}

/* Body / Splits */
.viewer-body {
    flex: 1;
    display: flex;
    overflow: hidden;
}

/* Hex Side */
.hex-panel-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 12px 16px;
}

.hex-header-row {
    display: flex;
    font-weight: 600;
    color: #64748b;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 6px;
    margin-bottom: 6px;
}

.cell {
    display: inline-block;
    text-align: center;
}

.offset-col {
    width: 75px;
    text-align: left;
    color: #94a3b8;
    flex-shrink: 0;
}

.hex-cols {
    display: flex;
    flex-shrink: 0;
    width: 440px;
    padding: 0 12px;
}

.hex-cell-header {
    width: 24px;
    margin-right: 4px;
}

.group-divider-col {
    margin-right: 14px !important;
}

.ascii-cols-header {
    padding-left: 8px;
    color: #64748b;
}

.hex-rows-container {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding-bottom: 12px;
}

/* Hex view scrollbar customization */
.hex-rows-container::-webkit-scrollbar {
    width: 6px;
}
.hex-rows-container::-webkit-scrollbar-track {
    background: transparent;
}
.hex-rows-container::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
}

.hex-row {
    display: flex;
    align-items: center;
    height: 20px;
    border-radius: 3px;
    transition: background-color 0.1s ease;
}

.hex-row:hover {
    background-color: #f8fafc;
}

.hex-byte-cell {
    width: 24px;
    margin-right: 4px;
    cursor: pointer;
    border-radius: 2px;
    color: #334155;
    transition: all 0.1s ease;
}

.hex-byte-cell.placeholder {
    color: #cbd5e1;
    cursor: default;
}

.hex-byte-cell:not(.placeholder):hover {
    background-color: #e2e8f0;
}

.hex-byte-cell.is-hovered {
    background-color: #dbeafe !important;
    color: #1d4ed8;
}

.hex-byte-cell.is-selected {
    background-color: #2563eb !important;
    color: #ffffff !important;
    font-weight: 600;
}

.ascii-cols {
    display: flex;
    padding-left: 20px;
}

.ascii-char-cell {
    width: 12px;
    text-align: center;
    cursor: pointer;
    border-radius: 2px;
    color: #475569;
    transition: all 0.1s ease;
}

.ascii-char-cell:hover {
    background-color: #e2e8f0;
}

.ascii-char-cell.is-hovered {
    background-color: #dbeafe !important;
    color: #1d4ed8;
}

.ascii-char-cell.is-selected {
    background-color: #2563eb !important;
    color: #ffffff !important;
    font-weight: 600;
}

/* Data Interpreter Inspector Panel (Right) */
.inspector-panel {
    width: 260px;
    border-left: 1px solid #e2e8f0;
    background-color: #f8fafc;
    display: flex;
    flex-direction: column;
    padding: 16px;
    box-sizing: border-box;
}

.inspector-title {
    font-size: 13px;
    font-weight: 600;
    color: #334155;
    margin-bottom: 12px;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 6px;
}

.inspector-body {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.inspector-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.inspector-row .label {
    font-size: 11px;
    color: #64748b;
}

.inspector-row .val {
    font-size: 12px;
    color: #0f172a;
    font-weight: 500;
    word-break: break-all;
    max-width: 160px;
    text-align: right;
}

.inspector-body .divider {
    height: 1px;
    background-color: #e2e8f0;
    margin: 4px 0;
}

.inspector-empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    color: #94a3b8;
    text-align: center;
    padding: 24px;
}

/* Footer / Pagination Styles */
.viewer-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    border-top: 1px solid #e2e8f0;
    background-color: #f8fafc;
}

.page-controls {
    display: flex;
    align-items: center;
    gap: 12px;
}

.page-info {
    font-size: 12px;
    color: #475569;
}

.page-size-selector {
    display: flex;
    align-items: center;
    gap: 8px;
}

.page-size-selector .label {
    font-size: 11px;
    color: #64748b;
}
</style>
