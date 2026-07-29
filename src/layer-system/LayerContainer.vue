<script setup>
import { provide, computed } from 'vue'

const props = defineProps({
    layer: {
        type: Object,
        required: true,
    },
    activeTopLayer: {
        type: Object,
        default: null,
    },
})

// 计算当前图层是否是顶层激活图层
const isLayerActive = computed(() => {
    if (!props.activeTopLayer) return false
    return props.activeTopLayer.id === props.layer.id
})

// 将激活状态向下透传给所有的子组件（如 MeshView, SpineView 等）
provide('isLayerActive', isLayerActive)
</script>

<template>
    <slot :is-active="isLayerActive"></slot>
</template>
