<script setup>
import { defineAsyncComponent } from 'vue'
import { useLayerStore } from './layerStore'
import PageHeader from './PageHeader.vue'
import { useI18nStore } from '../stores/i18n'
import LayerContainer from './LayerContainer.vue'

import { viewRegistry } from './viewRegistry'

const layerStore = useLayerStore()
const i18nStore = useI18nStore()

// Map component names to Vue files
const componentsMap = {}

// 自动扫描并懒加载其他组件（从多个重构目录导入）
const viewModules = import.meta.glob('../views/**/*.vue')
const viewerModules = import.meta.glob('../viewers/**/*.vue')
const toolModules = import.meta.glob('../tools/**/*.vue')
const modules = { ...viewModules, ...viewerModules, ...toolModules }

for (const path in modules) {
    const name = path
        .split('/')
        .pop()
        .replace(/\.\w+$/, '')
    if (!componentsMap[name]) {
        componentsMap[name] = defineAsyncComponent(modules[path])
    }
}

// 映射 HomeView 为 Home 别名
if (componentsMap['HomeView'] && !componentsMap['Home']) {
    componentsMap['Home'] = componentsMap['HomeView']
}

// Convert input description direction to CSS transition name
function getTransitionName(direction) {
    if (!direction) return 'slide-right'
    const d = direction.toLowerCase()
    if (d.includes('right') || d.includes('右')) return 'slide-right'
    if (d.includes('left') || d.includes('左')) return 'slide-left'
    if (d.includes('bottom') || d.includes('下')) return 'slide-bottom'
    if (d.includes('top') || d.includes('上')) return 'slide-top'
    if (d.includes('fade') || d.includes('渐')) return 'slide-fade'
    return 'slide-right'
}

function getLayerTitle(name) {
    const entry = viewRegistry[name]
    if (entry) {
        if (entry.titleKey) return i18nStore.t(entry.titleKey)
        if (entry.title) return entry.title
    }
    return name
}
</script>
<template>
    <div class="layer-render-container">
        <Transition
            v-for="layer in layerStore.orderedLayers"
            :key="layer.id"
            :name="getTransitionName(layer.direction)"
            appear
            @after-leave="layerStore.finalizeRemove(layer.id)"
        >
            <div
                v-if="layer.visible"
                class="layer-wrapper"
                :style="{
                    zIndex: layer.z,
                    '--layer-duration': layer.duration + 'ms',
                }"
            >
                <PageHeader
                    v-if="layer.name !== 'Home' && layer.name !== 'HomeView'"
                    :title="getLayerTitle(layer.name)"
                />
                <div class="layer-content">
                    <LayerContainer :layer="layer" :active-top-layer="layerStore.activeTopLayer">
                        <component :is="componentsMap[layer.name]" v-bind="layer.props" />
                    </LayerContainer>
                </div>
            </div>
        </Transition>
    </div>
</template>

<style scoped>
.layer-render-container {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    overflow: hidden;
}

/* Layer Base Styling */
.layer-wrapper {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: var(--td-bg-color-page);
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.layer-content {
    flex: 1;
    overflow: auto;
    position: relative;
    width: 100%;
    height: 100%;
}

/* --- Layer Transition Animations --- */

/* slide-right (Enters from Right-to-Left, Leaves to Right) */
.slide-right-enter-active,
.slide-right-leave-active {
    transition:
        transform var(--layer-duration, 700ms) cubic-bezier(0.16, 1, 0.3, 1),
        opacity var(--layer-duration, 700ms) ease-in-out;
    will-change: transform, opacity;
}
.slide-right-enter-from {
    transform: translateX(100%);
    opacity: 0;
}
.slide-right-leave-to {
    transform: translateX(100%);
    opacity: 0;
}

/* slide-left (Enters from Left-to-Right, Leaves to Left) */
.slide-left-enter-active,
.slide-left-leave-active {
    transition:
        transform var(--layer-duration, 700ms) cubic-bezier(0.16, 1, 0.3, 1),
        opacity var(--layer-duration, 700ms) ease-in-out;
    will-change: transform, opacity;
}
.slide-left-enter-from {
    transform: translateX(-100%);
    opacity: 0;
}
.slide-left-leave-to {
    transform: translateX(-100%);
    opacity: 0;
}

/* slide-bottom (Enters from Bottom-to-Top, Leaves to Bottom) */
.slide-bottom-enter-active,
.slide-bottom-leave-active {
    transition:
        transform var(--layer-duration, 700ms) cubic-bezier(0.16, 1, 0.3, 1),
        opacity var(--layer-duration, 700ms) ease-in-out;
    will-change: transform, opacity;
}
.slide-bottom-enter-from {
    transform: translateY(100%);
    opacity: 0;
}
.slide-bottom-leave-to {
    transform: translateY(100%);
    opacity: 0;
}

/* slide-top (Enters from Top-to-Bottom, Leaves to Top) */
.slide-top-enter-active,
.slide-top-leave-active {
    transition:
        transform var(--layer-duration, 700ms) cubic-bezier(0.16, 1, 0.3, 1),
        opacity var(--layer-duration, 700ms) ease-in-out;
    will-change: transform, opacity;
}
.slide-top-enter-from {
    transform: translateY(-100%);
    opacity: 0;
}
.slide-top-leave-to {
    transform: translateY(-100%);
    opacity: 0;
}

/* slide-fade (Enters and Leaves with Opacity Fade) */
.slide-fade-enter-active,
.slide-fade-leave-active {
    transition: opacity var(--layer-duration, 700ms) ease-in-out;
    will-change: opacity;
}
.slide-fade-enter-from,
.slide-fade-leave-to {
    opacity: 0;
}
</style>
