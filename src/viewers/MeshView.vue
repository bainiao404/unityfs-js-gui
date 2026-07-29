<template>
    <div class="mesh-viewer-container">
        <t-loading :loading="loading" show-overlay size="large" class="loading-overlay">
            <div v-if="!loading" class="mesh-content-layout">
                <!-- Header Section -->
                <div class="mesh-header">
                    <div class="header-main">
                        <div class="mesh-icon-wrapper">
                            <span class="mesh-cube-icon">🧊</span>
                        </div>
                        <div class="header-details">
                            <h2 class="mesh-title">{{ name || 'Unnamed Mesh' }}</h2>
                            <p class="mesh-subtitle">
                                Path ID: <span class="badge">{{ pathID }}</span> | Size:
                                <span class="badge">{{ formatSize(size) }}</span>
                            </p>
                        </div>
                    </div>
                    <div class="header-actions">
                        <t-button theme="primary" @click="handleExport" :loading="exporting"> Export OBJ </t-button>
                    </div>
                </div>

                <!-- 3D Viewport Card -->
                <div class="glass-card viewport-card">
                    <div class="viewport-header">
                        <h3 class="card-title">3D Viewport Preview</h3>
                        <div class="viewport-controls">
                            <t-checkbox v-model="showWireframe">Wireframe</t-checkbox>
                            <t-button variant="outline" size="small" @click="resetCamera">Reset View</t-button>
                        </div>
                    </div>
                    <div ref="canvasContainer" class="canvas-container"></div>
                </div>

                <!-- Main Content Grid -->
                <div class="mesh-grid">
                    <!-- Left Card: Metrics -->
                    <div class="glass-card metrics-card">
                        <h3 class="card-title">Geometry Metrics</h3>
                        <div class="metrics-grid">
                            <div class="metric-item">
                                <span class="metric-label">Vertices</span>
                                <span class="metric-value">{{ vertexCount }}</span>
                            </div>
                            <div class="metric-item">
                                <span class="metric-label">Indices</span>
                                <span class="metric-value">{{ indexCount }}</span>
                            </div>
                            <div class="metric-item">
                                <span class="metric-label">Triangles</span>
                                <span class="metric-value">{{ Math.floor(indexCount / 3) }}</span>
                            </div>
                            <div class="metric-item">
                                <span class="metric-label">Normals</span>
                                <span class="metric-value">{{ normalCount }}</span>
                            </div>
                            <div class="metric-item">
                                <span class="metric-label">UV Coordinates</span>
                                <span class="metric-value">{{ uvCount }}</span>
                            </div>
                            <div class="metric-item">
                                <span class="metric-label">Submeshes</span>
                                <span class="metric-value">{{ submeshCount }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Right Card: Bounding Box -->
                    <div class="glass-card aabb-card" v-if="localAABB">
                        <h3 class="card-title">Local Bounding Box (AABB)</h3>
                        <div class="aabb-container">
                            <div class="aabb-box min-box">
                                <div class="box-header">Min Bounds</div>
                                <div class="coordinate-row">
                                    <div class="coord">
                                        <span class="lbl">X</span>
                                        {{ formatFloat(localAABB.m_Center?.x - localAABB.m_Extent?.x) }}
                                    </div>
                                    <div class="coord">
                                        <span class="lbl">Y</span>
                                        {{ formatFloat(localAABB.m_Center?.y - localAABB.m_Extent?.y) }}
                                    </div>
                                    <div class="coord">
                                        <span class="lbl">Z</span>
                                        {{ formatFloat(localAABB.m_Center?.z - localAABB.m_Extent?.z) }}
                                    </div>
                                </div>
                            </div>
                            <div class="aabb-box max-box">
                                <div class="box-header">Max Bounds</div>
                                <div class="coordinate-row">
                                    <div class="coord">
                                        <span class="lbl">X</span>
                                        {{ formatFloat(localAABB.m_Center?.x + localAABB.m_Extent?.x) }}
                                    </div>
                                    <div class="coord">
                                        <span class="lbl">Y</span>
                                        {{ formatFloat(localAABB.m_Center?.y + localAABB.m_Extent?.y) }}
                                    </div>
                                    <div class="coord">
                                        <span class="lbl">Z</span>
                                        {{ formatFloat(localAABB.m_Center?.z + localAABB.m_Extent?.z) }}
                                    </div>
                                </div>
                            </div>
                            <div class="aabb-box center-box">
                                <div class="box-header">Center & Size</div>
                                <div class="coordinate-row center-row">
                                    <div class="coord">
                                        <span class="lbl">Center</span> ({{ formatFloat(localAABB.m_Center?.x) }},
                                        {{ formatFloat(localAABB.m_Center?.y) }},
                                        {{ formatFloat(localAABB.m_Center?.z) }})
                                    </div>
                                    <div class="coord">
                                        <span class="lbl">Extents</span> ({{ formatFloat(localAABB.m_Extent?.x) }},
                                        {{ formatFloat(localAABB.m_Extent?.y) }},
                                        {{ formatFloat(localAABB.m_Extent?.z) }})
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Submeshes Section -->
                <div class="glass-card submesh-card" v-if="submeshCount > 0">
                    <h3 class="card-title">Submesh Definitions</h3>
                    <div class="submesh-table-wrapper">
                        <table class="submesh-table">
                            <thead>
                                <tr>
                                    <th>Index</th>
                                    <th>Topology</th>
                                    <th>First Byte</th>
                                    <th>Index Count</th>
                                    <th>Vertex Count</th>
                                    <th>First Vertex</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(sub, idx) in submeshes" :key="idx">
                                    <td>
                                        <span class="badge secondary">#{{ idx }}</span>
                                    </td>
                                    <td>
                                        <strong>{{ sub.topology || 'Triangles' }}</strong>
                                    </td>
                                    <td>{{ sub.firstByte }}</td>
                                    <td>{{ sub.indexCount }}</td>
                                    <td>{{ sub.vertexCount }}</td>
                                    <td>{{ sub.firstVertex }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Text Preview Section -->
                <div class="glass-card preview-card" v-if="objPreview">
                    <div class="preview-header">
                        <h3 class="card-title">OBJ Data Preview (First 100 Lines)</h3>
                        <t-button variant="outline" size="small" @click="handleCopy">Copy Preview</t-button>
                    </div>
                    <div class="code-container">
                        <pre class="code-block">{{ objPreview }}</pre>
                    </div>
                </div>
            </div>
        </t-loading>
    </div>
</template>

<script setup>
import { UnityFSGui } from '@/services/unity/UnityFSGuiService'
import { setDependencies } from '@/assets/unityfs-js/index'
import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { onMounted, ref, nextTick, onBeforeUnmount, watch, inject } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import { ThreeMeshViewer } from '@/utils/threeMeshViewer'

const props = defineProps(['assetManagerId', 'objectId'])
const loading = ref(true)
const exporting = ref(false)

const name = ref('')
const pathID = ref('')
const size = ref(0)
const vertexCount = ref(0)
const normalCount = ref(0)
const uvCount = ref(0)
const indexCount = ref(0)
const submeshCount = ref(0)
const submeshes = ref([])
const localAABB = ref(null)
const objPreview = ref('')
let fullObjText = ''

// Three.js References
const canvasContainer = ref(null)
const showWireframe = ref(false)
let viewer = null

function formatSize(bytes) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatFloat(val) {
    if (val === undefined || val === null) return '0.00'
    return parseFloat(val).toFixed(4)
}

function resetCamera() {
    if (viewer) {
        viewer.resetCamera()
    }
}

watch(showWireframe, (val) => {
    if (viewer) {
        viewer.setWireframeVisible(val)
    }
})

async function start() {
    let meshToLoad = null
    try {
        loading.value = true
        const assetManager = await UnityFSGui.assetManagers.get(props.assetManagerId)
        const object = assetManager.getObjectInfos()[props.objectId]
        if (!object) {
            MessagePlugin.error('Failed to locate resource')
            return
        }

        name.value = object.name
        pathID.value = String(object.pathID)
        size.value = object.size

        const mesh = object.object
        if (mesh && typeof mesh.process === 'function') {
            await mesh.process()
            vertexCount.value = mesh.vertices?.length || 0
            normalCount.value = mesh.normals?.length || 0
            uvCount.value = mesh.uv0?.length || 0
            indexCount.value = mesh.indices?.length || 0
            submeshCount.value = mesh.subMeshes?.length || 0
            submeshes.value = mesh.subMeshes || []
            localAABB.value = mesh.localAABB || null
            meshToLoad = mesh
        }

        // Export data
        const fileInfo = await assetManager.exportFile(object)
        const rawText = fileInfo?.data?.raw
        if (rawText) {
            if (typeof rawText === 'string') {
                fullObjText = rawText
            } else if (rawText instanceof ArrayBuffer) {
                const decoder = new TextDecoder()
                fullObjText = decoder.decode(rawText)
            }
            objPreview.value = fullObjText.split('\n').slice(0, 100).join('\n')
        }
    } catch (err) {
        console.error('Failed to load Mesh details:', err)
        MessagePlugin.error(`Failed to load Mesh: ${err.message}`)
    } finally {
        loading.value = false
        if (meshToLoad) {
            nextTick(() => {
                if (canvasContainer.value) {
                    viewer = new ThreeMeshViewer(canvasContainer.value)
                    viewer.updateMesh(meshToLoad, showWireframe.value)
                }
            })
        }
    }
}

async function handleExport() {
    if (exporting.value) return
    try {
        exporting.value = true
        const assetManager = await UnityFSGui.assetManagers.get(props.assetManagerId)
        const object = assetManager.getObjectInfos()[props.objectId]
        if (!object) throw new Error('Resource not found')

        const fileInfo = await assetManager.exportFile(object)
        const rawData = fileInfo?.data?.raw
        if (!rawData) throw new Error('Export data is empty')

        // Browser Download
        const blob = new Blob([rawData], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${name.value || 'mesh'}.obj`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        MessagePlugin.success('OBJ exported successfully')
    } catch (err) {
        console.error(err)
        MessagePlugin.error(`Export failed: ${err.message}`)
    } finally {
        exporting.value = false
    }
}

async function handleCopy() {
    try {
        await navigator.clipboard.writeText(objPreview.value)
        MessagePlugin.success('Preview copied to clipboard')
    } catch {
        MessagePlugin.error('Failed to copy to clipboard')
    }
}

const isLayerActive = inject('isLayerActive', ref(true))

watch(isLayerActive, (active) => {
    if (viewer) {
        if (active) {
            viewer.play()
        } else {
            viewer.pause()
        }
    }
})

onMounted(() => {
    setDependencies({ THREE, GLTFExporter })
    nextTick(start)
})

onBeforeUnmount(() => {
    if (viewer) {
        viewer.destroy()
        viewer = null
    }
})
</script>

<style scoped>
.mesh-viewer-container {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    background-color: #f8fafc;
    overflow-y: auto;
    padding: 24px;
    box-sizing: border-box;
}

.loading-overlay {
    height: 100%;
    width: 100%;
}

.mesh-content-layout {
    display: flex;
    flex-direction: column;
    gap: 20px;
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
}

/* Header styling */
.mesh-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 24px;
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(226, 232, 240, 0.8);
    border-radius: 16px;
    box-shadow:
        0 4px 6px -1px rgba(0, 0, 0, 0.05),
        0 2px 4px -1px rgba(0, 0, 0, 0.03);
}

.header-main {
    display: flex;
    align-items: center;
    gap: 16px;
}

.mesh-icon-wrapper {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
}

.mesh-title {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: #1e293b;
}

.mesh-subtitle {
    margin: 4px 0 0 0;
    font-size: 13px;
    color: #64748b;
}

.badge {
    background: #e2e8f0;
    color: #334155;
    padding: 2px 8px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    font-family: monospace;
}

.badge.secondary {
    background: #dbeafe;
    color: #1e40af;
}

/* Glass card styling */
.glass-card {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(226, 232, 240, 0.8);
    border-radius: 16px;
    padding: 20px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.card-title {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
    color: #1e293b;
    border-bottom: 2px solid #3b82f6;
    padding-bottom: 6px;
    display: inline-block;
}

/* Grid Layout */
.mesh-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
}

@media (max-width: 768px) {
    .mesh-grid {
        grid-template-columns: 1fr;
    }
}

/* Metrics Card */
.metrics-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
}

.metric-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    background: rgba(255, 255, 255, 0.9);
    border: 1px solid #f1f5f9;
    padding: 12px;
    border-radius: 10px;
    text-align: center;
}

.metric-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    color: #64748b;
    letter-spacing: 0.5px;
}

.metric-value {
    font-size: 18px;
    font-weight: 700;
    color: #2563eb;
    font-family: monospace;
}

/* AABB Card */
.aabb-container {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.aabb-box {
    background: rgba(255, 255, 255, 0.9);
    border: 1px solid #f1f5f9;
    border-radius: 10px;
    padding: 10px 14px;
}

.box-header {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    color: #475569;
    margin-bottom: 6px;
}

.coordinate-row {
    display: flex;
    justify-content: space-between;
    gap: 10px;
}

.coord {
    font-family: monospace;
    font-size: 13px;
    color: #334155;
}

.coord .lbl {
    font-weight: 700;
    color: #ef4444;
    margin-right: 4px;
}

.aabb-box.max-box .coord .lbl {
    color: #22c55e;
}

.aabb-box.center-box .coord .lbl {
    color: #3b82f6;
}

.center-row {
    flex-direction: column;
    gap: 4px;
}

/* Table styling */
.submesh-table-wrapper {
    overflow-x: auto;
}

.submesh-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
    text-align: left;
}

.submesh-table th,
.submesh-table td {
    padding: 12px;
    border-bottom: 1px solid #f1f5f9;
}

.submesh-table th {
    font-weight: 600;
    color: #64748b;
    background: #f8fafc;
}

.submesh-table td {
    color: #334155;
    font-family: monospace;
}

/* Preview Card */
.preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.preview-header .card-title {
    margin-bottom: 0;
}

.code-container {
    background: #0f172a;
    border-radius: 12px;
    padding: 16px;
    max-height: 300px;
    overflow-y: auto;
    border: 1px solid #1e293b;
}

.code-block {
    margin: 0;
    color: #e2e8f0;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 13px;
    line-height: 1.6;
    white-space: pre-wrap;
}

/* Scrollbars */
.code-container::-webkit-scrollbar,
.mesh-viewer-container::-webkit-scrollbar {
    width: 8px;
}
.code-container::-webkit-scrollbar-thumb,
.mesh-viewer-container::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
}
.code-container::-webkit-scrollbar-thumb {
    background: #475569;
}

/* 3D Viewport Card */
.viewport-card {
    display: flex;
    flex-direction: column;
    height: 480px;
    padding: 20px;
    gap: 12px;
}

.viewport-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.viewport-controls {
    display: flex;
    align-items: center;
    gap: 16px;
}

.canvas-container {
    flex: 1;
    width: 100%;
    height: 100%;
    background: #0f172a;
    border-radius: 12px;
    overflow: hidden;
    position: relative;
    border: 1px solid #1e293b;
}
</style>
