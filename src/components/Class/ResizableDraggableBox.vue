<template>
    <div class="preview-outer-container" ref="container" @wheel="handleWheel">
        <div class="glass-controls">
            <div class="control-group">
                <button class="icon-btn" @click="handleZoomBtn(-1)" title="缩小">
                    <svg viewBox="0 0 24 24" width="18" height="18">
                        <path fill="currentColor" d="M19 13H5v-2h14v2z" />
                    </svg>
                </button>
                <div class="zoom-indicator" @click="reset">{{ (scale * 100).toFixed(0) }}%</div>
                <button class="icon-btn" @click="handleZoomBtn(1)" title="放大">
                    <svg viewBox="0 0 24 24" width="18" height="18">
                        <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                    </svg>
                </button>
            </div>
            <div class="divider"></div>
            <button class="text-btn" @click="reset">重置居中</button>
        </div>

        <div
            class="preview-content"
            ref="content"
            :style="{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                cursor: isDragging ? 'grabbing' : 'grab',
            }"
            @mousedown="startDrag"
            @touchstart="startDrag"
        >
            <div class="content-wrapper">
                <slot></slot>
            </div>
        </div>

        <div class="viewport-info">Canvas Mode · Scroll to Zoom</div>
    </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

const props = defineProps({
    initialScale: { type: Number, default: 1 },
    minScale: { type: Number, default: 0.1 },
    maxScale: { type: Number, default: 10 },
    zoomStep: { type: Number, default: 0.1 }, // 略微增加步长使缩放更顺滑
    isLoad: { type: Boolean },
})

const container = ref(null)
const content = ref(null)
const scale = ref(props.initialScale)
const position = ref({ x: 0, y: 0 })
const isDragging = ref(false)
const startPos = ref({ x: 0, y: 0 })

onMounted(() => {
    upView()
})

watch(
    () => props.isLoad,
    (val) => {
        if (val) {
            setTimeout(() => {
                upView()
            }, 0)
        }
    },
)

/**
 * 核心缩放算法：跟随指定坐标点缩放
 * @param {number} delta 缩放增量
 * @param {number} mouseX 鼠标在容器内的 X 坐标
 * @param {number} mouseY 鼠标在容器内的 Y 坐标
 */
const applyZoom = (delta, mouseX, mouseY) => {
    const oldScale = scale.value
    let newScale = oldScale + delta

    // 限制缩放范围
    newScale = Math.min(Math.max(newScale, props.minScale), props.maxScale)

    if (newScale === oldScale) return

    // 计算公式：
    // 1. 找到鼠标点相对于画布左上角的距离 (mouseX - position.x)
    // 2. 计算该点在缩放前的原始比例位置 (dist / oldScale)
    // 3. 计算缩放后的位置补偿，使该点依然保持在鼠标下方
    const zoomFactor = newScale / oldScale

    position.value = {
        x: mouseX - (mouseX - position.value.x) * zoomFactor,
        y: mouseY - (mouseY - position.value.y) * zoomFactor,
    }

    scale.value = newScale
}

// 滚轮事件处理
const handleWheel = (e) => {
    e.preventDefault()

    // 获取鼠标相对于容器的坐标
    const rect = container.value.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // 滚轮方向：向上为放大 (delta 为正)
    const delta = e.deltaY > 0 ? -props.zoomStep : props.zoomStep
    applyZoom(delta, mouseX, mouseY)
}

// 按钮缩放处理 (以容器中心为基准)
const handleZoomBtn = (direction) => {
    const rect = container.value.getBoundingClientRect()
    applyZoom(direction * props.zoomStep, rect.width / 2, rect.height / 2)
}

// 居中与初始化
const upView = () => {
    if (!container.value || !content.value) return
    const containerRect = container.value.getBoundingClientRect()
    // 临时重置缩放以获取原始尺寸
    const oldScale = scale.value
    scale.value = 1
    content.value.style.opacity = 0
    setTimeout(() => {
        const contentRect = content.value.getBoundingClientRect()
        const widthRatio = containerRect.width / contentRect.width
        const heightRatio = containerRect.height / contentRect.height
        scale.value = Math.min(widthRatio, heightRatio, 1) * 0.9

        // 居中
        const newContentRect = content.value.getBoundingClientRect()
        position.value = {
            x: (containerRect.width - contentRect.width * scale.value) / 2,
            y: (containerRect.height - contentRect.height * scale.value) / 2,
        }
        content.value.style.opacity = 1
    }, 0)
}

const reset = () => {
    scale.value = props.initialScale
    upView()
}

// 拖拽逻辑
const startDrag = (e) => {
    isDragging.value = true
    const clientX = e.clientX || e.touches?.[0].clientX
    const clientY = e.clientY || e.touches?.[0].clientY
    startPos.value = { x: clientX - position.value.x, y: clientY - position.value.y }

    window.addEventListener('mousemove', handleDrag)
    window.addEventListener('touchmove', handleDrag)
    window.addEventListener('mouseup', endDrag)
    window.addEventListener('touchend', endDrag)
}

const handleDrag = (e) => {
    if (!isDragging.value) return
    const clientX = e.clientX || e.touches?.[0].clientX
    const clientY = e.clientY || e.touches?.[0].clientY
    position.value = { x: clientX - startPos.value.x, y: clientY - startPos.value.y }
}

const endDrag = () => {
    isDragging.value = false
    window.removeEventListener('mousemove', handleDrag)
    window.removeEventListener('touchmove', handleDrag)
    window.removeEventListener('mouseup', endDrag)
    window.removeEventListener('touchend', endDrag)
}

onBeforeUnmount(() => {
    window.removeEventListener('mousemove', handleDrag)
    window.removeEventListener('touchmove', handleDrag)
})
</script>

<style scoped>
.preview-outer-container {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background-color: #1a1a1a;
    touch-action: none;
    user-select: none;
}

.preview-content {
    position: absolute;
    transform-origin: 0 0; /* 必须设为 0 0，因为我们的数学计算是基于左上角的偏移 */
    will-change: transform;
    display: inline-block;
    background-color: #ffffff;
    background-image:
        linear-gradient(45deg, #f5f5f5 25%, transparent 25%), linear-gradient(-45deg, #f5f5f5 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #f5f5f5 75%), linear-gradient(-45deg, transparent 75%, #f5f5f5 75%);
    background-size: 20px 20px;
    background-position:
        0 0,
        0 10px,
        10px -10px,
        -10px 0px;
    box-shadow: 0 10px 50px rgba(0, 0, 0, 0.4);
}

.glass-controls {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 100;
    display: flex;
    align-items: center;
    padding: 6px 12px;
    background: rgba(40, 40, 40, 0.75);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 50px; /* 药丸形状更现代 */
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
    color: #fff;
}

.control-group {
    display: flex;
    align-items: center;
    gap: 4px;
}

.icon-btn {
    background: transparent;
    border: none;
    color: #ddd;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    cursor: pointer;
}

.icon-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
}

.zoom-indicator {
    min-width: 45px;
    text-align: center;
    font-size: 12px;
    font-family: monospace;
    cursor: pointer;
}

.divider {
    width: 1px;
    height: 16px;
    background: rgba(255, 255, 255, 0.2);
    margin: 0 10px;
}

.text-btn {
    background: transparent;
    border: none;
    color: #ccc;
    font-size: 11px;
    cursor: pointer;
    padding: 4px 8px;
}

.viewport-info {
    position: absolute;
    top: 10px;
    right: 15px;
    font-size: 10px;
    color: #555;
    letter-spacing: 0.5px;
    pointer-events: none;
}
</style>
