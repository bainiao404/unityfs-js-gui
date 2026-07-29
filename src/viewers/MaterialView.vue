<template>
    <div class="data-viewer-container">
        <t-loading :loading="loading" show-overlay size="small" class="h-100 w-100">
            <div class="custom-tabs-layout">
                <!-- Custom Navigation Tabs -->
                <div class="custom-tabs-header">
                    <div
                        class="custom-tab-item"
                        :class="{ active: activeTab === 'properties' }"
                        @click="activeTab = 'properties'"
                    >
                        材质属性
                    </div>
                    <div class="custom-tab-item" :class="{ active: activeTab === 'json' }" @click="activeTab = 'json'">
                        JSON 数据
                    </div>
                </div>

                <!-- Tabs Content -->
                <div class="result-body-content">
                    <!-- Tab 1: Properties Preview -->
                    <div v-show="activeTab === 'properties'" class="content-wrapper scrollable-content">
                        <div class="properties-container">
                            <!-- Section: General info -->
                            <div class="meta-section">
                                <div class="section-title">基本信息</div>
                                <div class="info-grid">
                                    <div class="info-item">
                                        <div class="info-label">材质名称</div>
                                        <div class="info-value material-name">{{ materialName || '未命名材质' }}</div>
                                    </div>
                                    <div class="info-item">
                                        <div class="info-label">着色器 (Shader)</div>
                                        <div class="info-value shader-name">{{ shaderName }}</div>
                                    </div>
                                    <div class="info-item" v-if="shaderKeywords">
                                        <div class="info-label">着色器关键字 (Keywords)</div>
                                        <div class="info-value keywords-badge">{{ shaderKeywords }}</div>
                                    </div>
                                    <div class="info-item">
                                        <div class="info-label">渲染队列 (Render Queue)</div>
                                        <div class="info-value queue-badge">{{ renderQueue }}</div>
                                    </div>
                                </div>
                            </div>

                            <!-- Section: Textures -->
                            <div class="meta-section" v-if="textures.length > 0">
                                <div class="section-title">纹理通道 (Textures)</div>
                                <div class="textures-grid">
                                    <div v-for="tex in textures" :key="tex.key" class="texture-card">
                                        <div class="texture-preview">
                                            <t-loading
                                                :loading="tex.loading"
                                                size="small"
                                                class="h-100 w-100 flex-center"
                                            >
                                                <img
                                                    v-if="tex.src"
                                                    :src="tex.src"
                                                    class="preview-img"
                                                    alt="Texture Preview"
                                                />
                                                <div v-else class="preview-placeholder">
                                                    <span>📷</span>
                                                    <p>无贴图数据</p>
                                                </div>
                                            </t-loading>
                                        </div>
                                        <div class="texture-info">
                                            <div class="tex-key">{{ tex.key }}</div>
                                            <div class="tex-name" :title="tex.name">{{ tex.name }}</div>
                                            <div class="tex-coords">
                                                <span
                                                    >T: ({{ tex.scale.x.toFixed(2) }},
                                                    {{ tex.scale.y.toFixed(2) }})</span
                                                >
                                                <span
                                                    >O: ({{ tex.offset.x.toFixed(2) }},
                                                    {{ tex.offset.y.toFixed(2) }})</span
                                                >
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Section: Colors -->
                            <div class="meta-section" v-if="colors.length > 0">
                                <div class="section-title">颜色属性 (Colors)</div>
                                <div class="colors-grid">
                                    <div v-for="color in colors" :key="color.key" class="color-item-card">
                                        <div class="color-swatch" :style="{ backgroundColor: color.cssColor }"></div>
                                        <div class="color-details">
                                            <div class="color-key">{{ color.key }}</div>
                                            <div class="color-value">
                                                RGBA({{ color.r }}, {{ color.g }}, {{ color.b }},
                                                {{ color.a.toFixed(2) }})
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Section: Floats / Ints -->
                            <div class="parameters-grid">
                                <!-- Floats table -->
                                <div class="meta-section" v-if="floats.length > 0">
                                    <div class="section-title">浮点属性 (Floats)</div>
                                    <div class="param-table">
                                        <div class="param-row header">
                                            <span>属性键</span>
                                            <span>值</span>
                                        </div>
                                        <div v-for="f in floats" :key="f.key" class="param-row">
                                            <span class="param-key">{{ f.key }}</span>
                                            <span class="param-val">{{ f.value.toFixed(4) }}</span>
                                        </div>
                                    </div>
                                </div>

                                <!-- Integers table -->
                                <div class="meta-section" v-if="ints.length > 0">
                                    <div class="section-title">整数属性 (Integers)</div>
                                    <div class="param-table">
                                        <div class="param-row header">
                                            <span>属性键</span>
                                            <span>值</span>
                                        </div>
                                        <div v-for="i in ints" :key="i.key" class="param-row">
                                            <span class="param-key">{{ i.key }}</span>
                                            <span class="param-val">{{ i.value }}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Tab 2: JSON Mode -->
                    <div v-show="activeTab === 'json'" class="content-wrapper">
                        <json-viewer-monaco :data="rawJson" language="json" />
                    </div>
                </div>
            </div>
        </t-loading>
    </div>
</template>

<script setup>
import JsonViewerMonaco from './tools/JsonViewerMonaco.vue'
import { UnityFSGui } from '@/assets/unityfs-gui'
import { onMounted, ref, nextTick } from 'vue'

const props = defineProps(['assetManagerId', 'objectId'])
const loading = ref(true)
const activeTab = ref('properties')

const materialName = ref('')
const shaderName = ref('加载中...')
const shaderKeywords = ref('')
const renderQueue = ref(2000)

const textures = ref([])
const colors = ref([])
const floats = ref([])
const ints = ref([])
const rawJson = ref(null)

async function start() {
    try {
        loading.value = true
        const assetManager = await UnityFSGui.assetManagers.get(props.assetManagerId)
        const objectInfo = assetManager.getObjectInfos()[props.objectId]
        const scriptObj = objectInfo.object

        materialName.value = scriptObj.name
        shaderKeywords.value = scriptObj.shaderKeywords || ''
        renderQueue.value = scriptObj.customRenderQueue !== undefined ? scriptObj.customRenderQueue : 2000

        // Async resolve Shader details
        if (scriptObj.shader) {
            ;(async () => {
                try {
                    await scriptObj.shader.resolve()
                    if (scriptObj.shader.object) {
                        shaderName.value = scriptObj.shader.object.name
                    } else {
                        shaderName.value = `Shader (PathID: ${scriptObj.shader.pathID})`
                    }
                } catch (e) {
                    shaderName.value = '未知 Shader'
                }
            })()
        } else {
            shaderName.value = '无'
        }

        // Parse Floats
        if (scriptObj.savedProperties && scriptObj.savedProperties.floats) {
            floats.value = scriptObj.savedProperties.floats.map((f) => ({
                key: f.key,
                value: f.value,
            }))
        }

        // Parse Ints
        if (scriptObj.savedProperties && scriptObj.savedProperties.ints) {
            ints.value = scriptObj.savedProperties.ints.map((i) => ({
                key: i.key,
                value: i.value,
            }))
        }

        // Parse Colors
        if (scriptObj.savedProperties && scriptObj.savedProperties.colors) {
            colors.value = scriptObj.savedProperties.colors.map((c) => {
                const colorObj = c.value || {}
                const r = Math.round((colorObj.r || 0) * 255)
                const g = Math.round((colorObj.g || 0) * 255)
                const b = Math.round((colorObj.b || 0) * 255)
                const a = colorObj.a !== undefined ? colorObj.a : 1.0
                return {
                    key: c.key,
                    r,
                    g,
                    b,
                    a,
                    cssColor: `rgba(${r}, ${g}, ${b}, ${a})`,
                }
            })
        }

        // Parse Textures and resolve them in background
        if (scriptObj.savedProperties && scriptObj.savedProperties.texEnvs) {
            for (const env of scriptObj.savedProperties.texEnvs) {
                const texItem = ref({
                    key: env.key,
                    scale: env.value.scale || { x: 1, y: 1 },
                    offset: env.value.offset || { x: 0, y: 0 },
                    name: '无贴图',
                    loading: false,
                    src: null,
                })
                textures.value.push(texItem.value)

                const texPtr = env.value.texture
                if (texPtr && texPtr.pathID) {
                    texItem.value.loading = true
                    // Resolve texture background worker
                    ;(async () => {
                        try {
                            await texPtr.resolve()
                            if (texPtr.object) {
                                texItem.value.name = texPtr.object.name
                                const texObjectInfo = assetManager.getObjectInfoByPathId(BigInt(texPtr.pathID))
                                if (texObjectInfo) {
                                    const texFileInfo = await assetManager.exportFile(texObjectInfo, {
                                        type: 'dataURL',
                                    })
                                    if (texFileInfo && texFileInfo.data && texFileInfo.data.raw) {
                                        texItem.value.src = texFileInfo.data.raw
                                    }
                                }
                            }
                        } catch (err) {
                            console.error(`Failed to resolve texture for ${env.key}`, err)
                        } finally {
                            texItem.value.loading = false
                        }
                    })()
                }
            }
        }

        // Raw JSON dump
        rawJson.value = JSON.parse(
            JSON.stringify(scriptObj, (key, value) => {
                if (typeof value === 'bigint') {
                    return value.toString()
                }
                return value
            }),
        )
    } catch (e) {
        console.error('加载材质失败', e)
    } finally {
        loading.value = false
    }
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

.properties-container {
    max-width: 900px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
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

/* Info Grid */
.info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
}

.info-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.info-label {
    font-size: 12px;
    color: #94a3b8;
    font-weight: 500;
}

.info-value {
    font-size: 15px;
    color: #1e293b;
    font-weight: 500;
}

.info-value.material-name {
    font-size: 18px;
    font-weight: 600;
    color: #4f46e5;
}

.info-value.shader-name {
    color: #0f766e;
    font-weight: 600;
}

.keywords-badge {
    background-color: #f1f5f9;
    color: #475569;
    padding: 2px 8px;
    border-radius: 6px;
    font-size: 13px;
    font-family: monospace;
    width: fit-content;
}

.queue-badge {
    background-color: #ecfdf5;
    color: #059669;
    padding: 2px 8px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    width: fit-content;
}

/* Textures Grid */
.textures-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 16px;
}

.texture-card {
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background-color: #ffffff;
    transition: all 0.2s ease;
}

.texture-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    border-color: #cbd5e1;
}

.texture-preview {
    height: 140px;
    background-color: #f1f5f9;
    position: relative;
    border-bottom: 1px solid #e2e8f0;
}

.flex-center {
    display: flex;
    align-items: center;
    justify-content: center;
}

.preview-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    background-image: repeating-conic-gradient(#f8fafc 0% 25%, #cbd5e1 0% 50%);
    background-size: 16px 16px;
}

.preview-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    color: #94a3b8;
}

.preview-placeholder span {
    font-size: 28px;
}

.preview-placeholder p {
    margin: 0;
    font-size: 12px;
}

.texture-info {
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.tex-key {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    color: #64748b;
    letter-spacing: 0.5px;
}

.tex-name {
    font-size: 14px;
    font-weight: 600;
    color: #1e293b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.tex-coords {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: #94a3b8;
    font-family: monospace;
    margin-top: 4px;
}

/* Colors Grid */
.colors-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
}

.color-item-card {
    display: flex;
    align-items: center;
    gap: 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 8px 12px;
}

.color-swatch {
    width: 36px;
    height: 36px;
    border-radius: 6px;
    border: 1px solid #cbd5e1;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.05);
    flex-shrink: 0;
}

.color-details {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.color-key {
    font-size: 12px;
    font-weight: 600;
    color: #475569;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.color-value {
    font-size: 11px;
    color: #94a3b8;
    font-family: monospace;
}

/* Parameters tables */
.parameters-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
}

.param-table {
    display: flex;
    flex-direction: column;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
}

.param-row {
    display: flex;
    justify-content: space-between;
    padding: 10px 16px;
    border-bottom: 1px solid #f1f5f9;
    font-size: 13px;
    color: #334155;
}

.param-row.header {
    background-color: #f8fafc;
    font-weight: 600;
    color: #475569;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.param-row:last-child {
    border-bottom: none;
}

.param-key {
    font-family: monospace;
    font-weight: 500;
}

.param-val {
    font-family: monospace;
    color: #0f766e;
    font-weight: 600;
}

.h-100 {
    height: 100%;
}

.w-100 {
    width: 100%;
}

@media (max-width: 768px) {
    .info-grid {
        grid-template-columns: 1fr;
    }
    .parameters-grid {
        grid-template-columns: 1fr;
    }
}
</style>
