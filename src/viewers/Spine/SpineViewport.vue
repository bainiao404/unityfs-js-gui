<template>
    <div class="canvas-wrapper-outer">
        <div ref="canvasContainer" class="canvas-wrapper" @wheel="handleWheel" @contextmenu.prevent>
            <div v-if="spineListEmpty" class="empty-placeholder">
                <t-empty title="暂无预览内容" description="请从外部传入 spinePlaces 数据" />
            </div>
        </div>

        <!-- Floating Viewport Toolbar -->
        <div class="viewport-toolbar">
            <t-button variant="text" shape="square" @click="zoomCamera(1)" title="放大">
                <template #icon><zoom-in-icon /></template>
            </t-button>
            <span class="zoom-percentage-text">{{ zoomPercent }}%</span>
            <t-button variant="text" shape="square" @click="zoomCamera(-1)" title="缩小">
                <template #icon><zoom-out-icon /></template>
            </t-button>
            <t-button variant="text" shape="square" @click="resetCamera" title="重置摄像机">
                <template #icon><home-icon /></template>
            </t-button>
            <t-tooltip content="镜头聚焦至选中模型">
                <t-button
                    variant="text"
                    shape="square"
                    @click="$emit('focus-active')"
                    :disabled="spineListEmpty"
                    title="聚焦选中"
                >
                    <template #icon><focus-icon /></template>
                </t-button>
            </t-tooltip>
            <t-divider layout="vertical" style="margin: 0 4px" />
            <t-button variant="text" shape="square" @click="$emit('toggle-play')" :title="isPlaying ? '暂停' : '播放'">
                <template #icon>
                    <pause-circle-icon v-if="isPlaying" />
                    <play-circle-icon v-else />
                </template>
            </t-button>
            <t-button variant="text" shape="square" @click="$emit('cycle-background')" title="切换背景">
                <template #icon><image-icon /></template>
            </t-button>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import {
    ZoomInIcon,
    ZoomOutIcon,
    HomeIcon,
    PauseCircleIcon,
    PlayCircleIcon,
    ImageIcon,
    FocusIcon,
} from 'tdesign-icons-vue-next'

const props = defineProps({
    spineListEmpty: { type: Boolean, default: true },
    isPlaying: { type: Boolean, default: true },
})

const emit = defineEmits(['init', 'close', 'toggle-play', 'cycle-background', 'focus-active'])

const canvasContainer = ref(null)
let app = null
let world = null
let resizeObserver = null
const zoomPercent = ref(100)

function updateZoomPercent() {
    if (world) {
        zoomPercent.value = Math.round(world.scale.x * 100)
    }
}

function initApp() {
    if (app) return
    const rect = canvasContainer.value.getBoundingClientRect()

    // PIXI is expected as a global variable loaded in index.html
    const PIXI = window.PIXI
    if (!PIXI) {
        console.error('PIXI is not loaded!')
        return
    }

    app = new PIXI.Application({
        backgroundAlpha: 0,
        resolution: window.devicePixelRatio || 2,
        autoDensity: true,
        width: rect.width,
        height: rect.height,
    })

    canvasContainer.value.appendChild(app.view)
    world = new PIXI.Container()
    world.sortableChildren = true
    world.x = rect.width / 2
    world.y = rect.height / 2
    app.stage.addChild(world)

    // Make stage interactive for background panning
    app.stage.interactive = true
    app.stage.hitArea = app.screen
    app.stage.on('pointerdown', handlePointerDown)
    app.stage.on('pointermove', handlePointerMove)
    app.stage.on('pointerup', handlePointerUp)
    app.stage.on('pointerupoutside', handlePointerUp)

    updateZoomPercent()

    resizeObserver = new ResizeObserver((entries) => {
        if (!app || !app.renderer) return
        for (let entry of entries) {
            const { width, height } = entry.contentRect
            app.renderer.resize(width, height)
            if (world) {
                world.x = width / 2
                world.y = height / 2
            }
        }
    })
    resizeObserver.observe(canvasContainer.value)

    emit('init', { app, world })
}

function zoomCamera(direction) {
    if (!world || !canvasContainer.value) return
    let newScale = world.scale.x + direction * 0.1
    newScale = Math.max(0.1, Math.min(newScale, 5))

    const rect = canvasContainer.value.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const worldCenterX = (centerX - world.x) / world.scale.x
    const worldCenterY = (centerY - world.y) / world.scale.y

    world.scale.set(newScale)
    world.x = centerX - worldCenterX * newScale
    world.y = centerY - worldCenterY * newScale

    updateZoomPercent()
}

function resetCamera() {
    if (!world || !canvasContainer.value) return
    const rect = canvasContainer.value.getBoundingClientRect()
    world.scale.set(1)
    world.x = rect.width / 2
    world.y = rect.height / 2

    updateZoomPercent()
}

function focusOnBounds(bounds, instanceCoords) {
    if (!world || !canvasContainer.value || !bounds) return
    const rect = canvasContainer.value.getBoundingClientRect()

    const localCenterX = bounds.x + bounds.width / 2
    const localCenterY = bounds.y + bounds.height / 2

    const padding = 80
    const maxDim = Math.max(bounds.width, bounds.height)
    let targetScale = 1
    if (maxDim > 0) {
        targetScale = Math.min(rect.width - padding, rect.height - padding) / maxDim
    }
    targetScale = Math.max(0.2, Math.min(targetScale, 2.5))

    world.scale.set(targetScale)
    world.x = rect.width / 2 - (instanceCoords.x + localCenterX) * targetScale
    world.y = rect.height / 2 - (instanceCoords.y + localCenterY) * targetScale

    updateZoomPercent()
}

let isPanning = false
let startPan = { x: 0, y: 0 }

function handlePointerDown(e) {
    // Stage events are PIXI FederatedPointerEvents.
    // e.target is the specific node clicked. Stage is the top fallback target.
    if (e.button === 1 || e.button === 2 || (e.button === 0 && e.target === app.stage)) {
        isPanning = true
        startPan = { x: e.data.global.x - world.x, y: e.data.global.y - world.y }
    }
}

function handlePointerMove(e) {
    if (!isPanning || !world) return
    world.x = e.data.global.x - startPan.x
    world.y = e.data.global.y - startPan.y
}

function handlePointerUp() {
    isPanning = false
}

function handleWheel(e) {
    e.preventDefault()
    if (!world || !canvasContainer.value) return

    const zoomFactor = 0.05
    let newScale = world.scale.x
    if (e.deltaY < 0) {
        newScale += zoomFactor
    } else {
        newScale -= zoomFactor
    }
    newScale = Math.max(0.1, Math.min(newScale, 5))

    const rect = canvasContainer.value.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const worldMouseX = (mouseX - world.x) / world.scale.x
    const worldMouseY = (mouseY - world.y) / world.scale.y

    world.scale.set(newScale)
    world.x = mouseX - worldMouseX * newScale
    world.y = mouseY - worldMouseY * newScale

    updateZoomPercent()
}

onMounted(() => {
    initApp()
})

onUnmounted(() => {
    if (resizeObserver) {
        resizeObserver.disconnect()
        resizeObserver = null
    }
    if (app) {
        try {
            app.destroy(true)
        } catch (e) {
            console.warn('PIXI app destroy warning:', e)
        }
        app = null
    }
})

defineExpose({
    zoomCamera,
    resetCamera,
    focusOnBounds,
    updateZoomPercent,
})
</script>

<style scoped>
.canvas-wrapper-outer {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
}

.canvas-wrapper {
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
}

.empty-placeholder {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
}

.viewport-toolbar {
    position: absolute;
    left: 16px;
    bottom: 24px;
    z-index: 101;
    background-color: var(--td-bg-color-container);
    border: 1px solid var(--td-component-border);
    border-radius: 8px;
    padding: 6px;
    display: flex;
    align-items: center;
    gap: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.zoom-percentage-text {
    font-size: 11px;
    font-family: monospace;
    color: var(--td-text-color-secondary);
    min-width: 36px;
    text-align: center;
    user-select: none;
}

@media (max-width: 768px) {
    .viewport-toolbar {
        left: 12px;
        bottom: auto;
        top: 12px;
        padding: 4px;
    }
}
</style>
