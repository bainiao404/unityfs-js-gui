<template>
    <div
        v-show="percentageShow"
        style="
            position: absolute;
            width: calc(100% - 40px);
            bottom: 0px;
            left: 0px;
            padding: 10px;
            border-radius: 8px;
            box-shadow: 1px 1px 1px rgba(50, 50, 50, 0.2);
            margin: 10px;
            background: rgba(255, 255, 255);
        "
    >
        <div>{{ title }}</div>
        <t-progress theme="line" :percentage="loadPercentage" />
    </div>
</template>
<script setup>
import { watch, ref } from 'vue'
const props = defineProps({
    progress: { type: Number, default: -1 },
    title: { type: String, default: '' },
})

const loadPercentage = ref(0)
const percentageShow = ref(false)

watch(
    () => props.progress,
    (val) => {
        percentageShow.value = val >= 0
        loadPercentage.value = Math.floor(val * 100)
    },
    { immediate: true },
)
</script>
<style scoped></style>
