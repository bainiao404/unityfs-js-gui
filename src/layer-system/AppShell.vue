<script setup>
import { onMounted, onUnmounted, watch } from 'vue'
import LayerViewport from './LayerViewport.vue'
import { useLayerStore } from './layerStore.js'

const layerStore = useLayerStore()

const isCordova = typeof window !== 'undefined' && !!window.cordova

// Automatically display Home page when there are no visible layers
watch(
    () => layerStore.layers.filter((l) => l.visible).length,
    (visibleCount) => {
        if (visibleCount === 0) {
            layerStore.add({ name: 'Home', z: 10, direction: 'fade' })
        }
    },
    { immediate: true },
)

// Handlers for going back
function onBackGesture(e) {
    if (e) e.preventDefault()
    layerStore.back()
}

function onContextMenu(e) {
    e.preventDefault()
    layerStore.back()
}

function onKeyDown(e) {
    if (e.key === 'Escape') {
        layerStore.back()
    }
}

onMounted(() => {
    // Electron right-click back listener (disabled on Cordova)
    if (!isCordova) {
        window.addEventListener('contextmenu', onContextMenu, false)
    }

    // Cordova physical back button listener
    document.addEventListener('backbutton', onBackGesture, false)

    // Keyboard ESC key back listener
    window.addEventListener('keydown', onKeyDown, false)
})

onUnmounted(() => {
    if (!isCordova) {
        window.removeEventListener('contextmenu', onContextMenu)
    }
    document.removeEventListener('backbutton', onBackGesture)
    window.removeEventListener('keydown', onKeyDown)
})
</script>

<template>
    <div class="app-shell">
        <!-- App Content Shell (takes remaining viewport height) -->
        <div class="content-viewport">
            <!-- Dynamic Layer Renderer Stack -->
            <div class="viewport-wrapper">
                <LayerViewport />
            </div>
        </div>
    </div>
</template>

<style scoped>
.app-shell {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    background-color: var(--td-bg-color-page);
}

.content-viewport {
    flex: 1;
    position: relative;
    overflow: hidden;
}

.viewport-wrapper {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    overflow: hidden;
}
</style>
