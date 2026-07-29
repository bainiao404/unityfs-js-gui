<template>
    <div class="image-viewer-viewport">
        <t-loading :loading="loading" show-overlay size="small" class="h-100 w-100">
            <ResizableDraggableBox :is-load="isState">
                <canvas ref="canvasRef"></canvas>
            </ResizableDraggableBox>

            <!-- Bottom Left Metadata Panel -->
            <div class="image-meta-card" v-if="imgWidth && !loading">
                <div class="meta-title" v-if="imageName" :title="imageName">{{ imageName }}</div>
                <div class="meta-divider" v-if="imageName"></div>
                <div class="meta-row">
                    <span class="meta-label">分辨率</span>
                    <span class="meta-value">{{ imgWidth }} × {{ imgHeight }} px</span>
                </div>
                <div class="meta-divider" v-if="imgRect"></div>
                <div class="meta-section" v-if="imgRect">
                    <span class="section-title">切片区域 (Rect)</span>
                    <div class="rect-grid">
                        <div class="rect-item" v-for="(val, key) in imgRect" :key="key">
                            <span class="rect-label">{{ key }}</span>
                            <span class="rect-value">{{ val }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </t-loading>
    </div>
</template>

<script setup>
import { UnityFSGui } from '@/services/unity/UnityFSGuiService'
import { onMounted, ref, nextTick } from 'vue'
import ResizableDraggableBox from '../components/ResizableDraggableBox.vue'

const props = defineProps(['assetManagerId', 'objectId', 'pathID'])
const loading = ref(true)
const canvasRef = ref(null)
const isState = ref(false)
const imgRect = ref(null)
const imgWidth = ref(null)
const imgHeight = ref(null)
const imageName = ref('')

async function start() {
    try {
        loading.value = true
        const assetManager = await UnityFSGui.assetManagers.get(props.assetManagerId)

        // 优先使用 pathID 精准匹配，防止大文件中偏移导致预览错误的对象
        const object = props.pathID
            ? assetManager.getObjectInfoByPathId(BigInt(props.pathID))
            : assetManager.getObjectInfos()[props.objectId]

        if (!object) return
        imageName.value = object.name || ''

        const fileInfo = await assetManager.exportFile(object, { type: 'rgbaArray' })
        if (!fileInfo || !fileInfo.data) {
            console.error('Failed to export image/sprite data:', fileInfo)
            return
        }

        const { width, height, raw, rect } = fileInfo.data
        imgWidth.value = width
        imgHeight.value = height
        imgRect.value = rect || null

        await nextTick()
        const canvas = canvasRef.value
        if (canvas) {
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')
            const imageData = ctx.createImageData(width, height)
            imageData.data.set(raw)
            ctx.putImageData(imageData, 0, 0)
        }
        isState.value = true
    } catch (err) {
        console.error('Error loading image viewer:', err)
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    nextTick(start)
})
</script>

<style scoped>
.image-viewer-viewport {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0px;
    left: 0px;
    overflow: hidden;
    background-color: var(--td-bg-color-page);
}

.h-100 {
    height: 100%;
}

.w-100 {
    width: 100%;
}

.image-meta-card {
    position: absolute;
    left: 16px;
    bottom: 16px;
    z-index: 10;
    pointer-events: auto;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid var(--td-component-border);
    border-radius: 8px;
    padding: 12px 16px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 180px;
}

/* Dark theme adaptation */
:deep(.dark) .image-meta-card {
    background: rgba(30, 30, 30, 0.85);
}

.meta-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--td-text-color-primary);
    word-break: break-all;
    max-width: 240px;
}

.meta-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
}

.meta-label {
    font-size: 11px;
    color: var(--td-text-color-placeholder);
}

.meta-value {
    font-size: 12px;
    font-weight: 600;
    color: var(--td-text-color-primary);
    font-family: monospace;
}

.meta-divider {
    height: 1px;
    background: var(--td-component-border);
    margin: 2px 0;
}

.meta-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.section-title {
    font-size: 10px;
    font-weight: 600;
    color: var(--td-text-color-placeholder);
    text-transform: uppercase;
}

.rect-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
}

.rect-item {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    background: var(--td-bg-color-secondarycontainer);
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid var(--td-component-border);
}

.rect-label {
    font-size: 10px;
    color: var(--td-text-color-placeholder);
    font-family: monospace;
}

.rect-value {
    font-size: 10px;
    font-weight: 600;
    color: var(--td-text-color-primary);
    font-family: monospace;
}
</style>
