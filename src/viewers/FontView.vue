<template>
    <div class="data-viewer-container">
        <t-loading :loading="loading" show-overlay size="small" class="h-100 w-100">
            <div class="content-wrapper scrollable-content">
                <div class="font-viewer-grid">
                    <!-- Left: Interactive Sandbox -->
                    <div class="preview-sandbox meta-section">
                        <div class="section-title">实时交互预览</div>

                        <div class="sandbox-controls">
                            <div class="control-group text-input-group">
                                <label>自定义预览文本</label>
                                <input
                                    type="text"
                                    v-model="previewText"
                                    placeholder="在此输入文字查看效果..."
                                    class="custom-input"
                                />
                            </div>

                            <div class="control-group size-slider-group">
                                <label>字体大小: {{ fontSizePx }}px</label>
                                <input type="range" min="14" max="96" v-model="fontSizePx" class="custom-slider" />
                            </div>
                        </div>

                        <!-- Preview Area -->
                        <div class="sandbox-display-panel">
                            <div
                                v-if="fontLoaded"
                                :style="{ fontFamily: fontFamilyId, fontSize: fontSizePx + 'px' }"
                                class="sandbox-text"
                            >
                                {{ previewText || '白鸟GKD - Unity 字体查看器 (1234567890 ABCDEF abcdef)' }}
                            </div>
                            <div v-else class="fallback-warning-panel">
                                <div class="fallback-icon">⚠️</div>
                                <div class="fallback-text">
                                    <h4>未检出内嵌字体文件数据</h4>
                                    <p>该资产可能为位图字体或自定义纹理材质字体，无法在浏览器中直接动态渲染渲染。</p>
                                </div>
                            </div>
                        </div>

                        <!-- Predefined sizes preview -->
                        <div class="predefined-sizes" v-if="fontLoaded">
                            <div class="section-subtitle">字号阶梯预览</div>
                            <div class="predefined-row" :style="{ fontFamily: fontFamilyId }">
                                <span class="size-label">18px</span>
                                <p style="font-size: 18px">The quick brown fox jumps over the lazy dog.</p>
                            </div>
                            <div class="predefined-row" :style="{ fontFamily: fontFamilyId }">
                                <span class="size-label">28px</span>
                                <p style="font-size: 28px">白鸟GKD Unity 资产提取工具箱</p>
                            </div>
                            <div class="predefined-row" :style="{ fontFamily: fontFamilyId }">
                                <span class="size-label">38px</span>
                                <p style="font-size: 38px">Aa Bb Cc 123 456</p>
                            </div>
                        </div>
                    </div>

                    <!-- Right: Metadata & Downloads -->
                    <div class="metadata-column">
                        <div class="meta-section">
                            <div class="section-title">字体信息</div>
                            <div class="info-grid">
                                <div class="info-item full-width">
                                    <div class="info-label">字体名称</div>
                                    <div class="info-value font-name-title">{{ fontName || '未命名字体' }}</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">默认字号 (Size)</div>
                                    <div class="info-value">{{ fontBaseSize || '无' }}</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">行间距 (Line Spacing)</div>
                                    <div class="info-value">{{ lineSpacing || '无' }}</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">字符间距 (Spacing)</div>
                                    <div class="info-value">{{ charSpacing || 0 }}</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">字符内边距 (Padding)</div>
                                    <div class="info-value">{{ charPadding || 0 }}</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">字形数量 (Glyphs)</div>
                                    <div class="info-value glyph-count">{{ glyphsCount }}</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">像素缩放 (Pixel Scale)</div>
                                    <div class="info-value">{{ pixelScale }}</div>
                                </div>
                            </div>
                        </div>

                        <!-- Action Section -->
                        <div class="meta-section actions-panel" v-if="fontLoaded">
                            <div class="section-title">资产操作</div>
                            <button class="action-btn download-btn" @click="downloadFont">
                                <span>📥</span> 下载 TTF 字体文件
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </t-loading>
    </div>
</template>

<script setup>
import { UnityFSGui } from '@/assets/unityfs-gui'
import { onMounted, ref, nextTick } from 'vue'

const props = defineProps(['assetManagerId', 'objectId'])
const loading = ref(true)

const fontName = ref('')
const fontBaseSize = ref(18)
const lineSpacing = ref(0)
const charSpacing = ref(0)
const charPadding = ref(0)
const glyphsCount = ref(0)
const pixelScale = ref(1.0)

const fontLoaded = ref(false)
const fontFamilyId = ref('')
const fontSizePx = ref(32)
const previewText = ref('')

let rawFontData = null

async function start() {
    try {
        loading.value = true
        const assetManager = await UnityFSGui.assetManagers.get(props.assetManagerId)
        const objectInfo = assetManager.getObjectInfos()[props.objectId]
        const fontObj = objectInfo.object

        fontName.value = fontObj.name
        fontBaseSize.value = fontObj.fontSize || 18
        lineSpacing.value = fontObj.lineSpacing || 0
        charSpacing.value = fontObj.characterSpacing || 0
        charPadding.value = fontObj.characterPadding || 0
        glyphsCount.value = fontObj.characterRects ? fontObj.characterRects.length : 0
        pixelScale.value = fontObj.pixelScale !== undefined ? fontObj.pixelScale : 1.0

        // Parse raw fontData blob if exists
        if (fontObj.fontData && fontObj.fontData.length > 0) {
            rawFontData = fontObj.fontData
            try {
                // Trigger dynamic FontFace loader
                const fontID = await fontObj.loadFont()
                fontFamilyId.value = fontID
                fontLoaded.value = true
            } catch (err) {
                console.error('Failed to load dynamic FontFace', err)
                fontLoaded.value = false
            }
        } else {
            fontLoaded.value = false
        }
    } catch (e) {
        console.error('加载字体资产失败', e)
    } finally {
        loading.value = false
    }
}

function downloadFont() {
    if (!rawFontData) return
    const blob = new Blob([rawFontData], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${fontName.value || 'Font'}.ttf`
    a.click()
    URL.revokeObjectURL(url)
}

onMounted(() => {
    nextTick(start)
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

.data-viewer-container {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    background-color: #f8fafc;
    overflow: hidden;
    height: 100%;
    width: 100%;
    top: 0px;
    left: 0px;
    font-family:
        'Outfit',
        -apple-system,
        BlinkMacSystemFont,
        'Segoe UI',
        Roboto,
        Helvetica,
        Arial,
        sans-serif;
}

.custom-tabs-layout {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    overflow: hidden;
}

.custom-tabs-header {
    display: flex;
    border-bottom: 1px solid var(--td-component-border);
    background-color: #ffffff;
    padding: 0 24px;
    gap: 24px;
    flex-shrink: 0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.custom-tab-item {
    padding: 14px 4px;
    font-size: 14px;
    cursor: pointer;
    color: var(--td-text-color-secondary);
    border-bottom: 2px solid transparent;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
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

.content-wrapper {
    position: relative;
    height: 100%;
    width: 100%;
    overflow: hidden;
    box-sizing: border-box;
}

.scrollable-content {
    overflow-y: auto;
    padding: 24px;
}

/* Grid Layout */
.font-viewer-grid {
    max-width: 1100px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr 340px;
    gap: 24px;
}

.meta-section {
    background-color: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 20px 24px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.01);
}

.section-title {
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #64748b;
    border-bottom: 1px solid #f1f5f9;
    padding-bottom: 10px;
    margin-bottom: 16px;
}

.section-subtitle {
    font-size: 13px;
    font-weight: 600;
    color: #475569;
    margin-bottom: 12px;
    margin-top: 24px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

/* Interactive Sandbox Controls */
.sandbox-controls {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 20px;
}

.control-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.control-group label {
    font-size: 12px;
    color: #64748b;
    font-weight: 600;
}

.custom-input {
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 14px;
    color: #1e293b;
    outline: none;
    transition: border-color 0.2s;
    font-family: inherit;
}

.custom-input:focus {
    border-color: #4f46e5;
}

.custom-slider {
    -webkit-appearance: none;
    width: 100%;
    height: 6px;
    border-radius: 3px;
    background: #e2e8f0;
    outline: none;
    margin-top: 10px;
}

.custom-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #4f46e5;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
    transition: transform 0.1s;
}

.custom-slider::-webkit-slider-thumb:hover {
    transform: scale(1.25);
}

/* Sandbox Display */
.sandbox-display-panel {
    background-color: #f8fafc;
    border: 1px dashed #cbd5e1;
    border-radius: 10px;
    padding: 24px;
    min-height: 180px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
}

.sandbox-text {
    width: 100%;
    color: #1e293b;
    word-break: break-all;
    line-height: 1.4;
    text-align: center;
}

/* Predefined sizes list */
.predefined-row {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    border-bottom: 1px solid #f1f5f9;
    padding: 12px 0;
}

.predefined-row:last-child {
    border-bottom: none;
}

.size-label {
    font-size: 11px;
    font-weight: 600;
    color: #94a3b8;
    background-color: #f1f5f9;
    padding: 2px 6px;
    border-radius: 4px;
    margin-top: 4px;
    flex-shrink: 0;
}

.predefined-row p {
    margin: 0;
    color: #1e293b;
    word-break: break-all;
    line-height: 1.3;
}

/* Fallback warnings */
.fallback-warning-panel {
    display: flex;
    gap: 16px;
    align-items: center;
    background-color: #fffbeb;
    border: 1px solid #fef3c7;
    border-radius: 8px;
    padding: 16px 20px;
}

.fallback-icon {
    font-size: 32px;
}

.fallback-text h4 {
    margin: 0;
    color: #b45309;
    font-size: 15px;
    font-weight: 600;
}

.fallback-text p {
    margin: 4px 0 0 0;
    color: #d97706;
    font-size: 12px;
    line-height: 1.4;
}

/* Metadata Column */
.metadata-column {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
}

.info-item {
    display: flex;
    flex-direction: column;
    gap: 3px;
}

.info-item.full-width {
    grid-column: span 2;
}

.info-label {
    font-size: 11px;
    color: #94a3b8;
    font-weight: 500;
}

.info-value {
    font-size: 14px;
    color: #334155;
    font-weight: 500;
}

.font-name-title {
    font-size: 18px;
    font-weight: 600;
    color: #4f46e5;
}

.glyph-count {
    color: #0f766e;
    font-weight: 600;
}

/* Actions Panel */
.actions-panel {
    background-color: #eff6ff;
    border-color: #bfdbfe;
}

.action-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: none;
    border-radius: 8px;
    padding: 12px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
}

.download-btn {
    background-color: #3b82f6;
    color: #ffffff;
    box-shadow: 0 4px 10px rgba(59, 130, 246, 0.2);
}

.download-btn:hover {
    background-color: #2563eb;
    transform: translateY(-1px);
    box-shadow: 0 6px 14px rgba(37, 99, 235, 0.25);
}

.h-100 {
    height: 100%;
}

.w-100 {
    width: 100%;
}

@media (max-width: 900px) {
    .font-viewer-grid {
        grid-template-columns: 1fr;
    }
    .sandbox-controls {
        grid-template-columns: 1fr;
    }
}
</style>
