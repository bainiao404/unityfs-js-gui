<template>
    <div style="position: absolute; width: 100%; height: 100%; top: 0px; left: 0px">
        <ResizableDraggableBox :is-load="isSate">
            <div ref="box"></div>
        </ResizableDraggableBox>
        <div
            style="
                position: absolute;
                left: 0px;
                bottom: 0px;
                pointer-events: none;
                font-size: 14px;
                padding: 4px;
                background: rgba(250, 250, 250, 0.2);
            "
        >
            <div>width:{{ imgWidth }}</div>
            <div>height:{{ imgHeight }}</div>
            <template v-if="imgRect">
                <div>rect:</div>
                <div style="padding: 5px; border-style: solid; border-width: 1px; border-color: rgb(200, 200, 200)">
                    <div v-for="(value, key) in imgRect">
                        {{ key + ':' + value }}
                    </div>
                </div>
            </template>
        </div>
    </div>
</template>
<script setup>
import { UnityFSGui } from '@/assets/unityfs-gui'
import { onMounted, ref, useTemplateRef, nextTick } from 'vue'
import ResizableDraggableBox from '../Class/ResizableDraggableBox.vue'
let { assetManagerId, objectId, pathID } = defineProps(['assetManagerId', 'objectId', 'pathID'])
let box = useTemplateRef('box')
let isSate = ref(false)
let imgRect = ref(null)
let imgWidth = ref(null)
let imgHeight = ref(null)
async function start() {
    let assetManager = await UnityFSGui.assetManagers.get(assetManagerId)
    // 优先用 pathID 精确定位，防止大文件中索引偏移导致预览错误的对象
    let object = pathID ? assetManager.getObjectInfoByPathId(BigInt(pathID)) : assetManager.getObjectInfos()[objectId]
    let fileInfo = await assetManager.exportFile(object, { type: 'rgbaArray' })
    if (!fileInfo || !fileInfo.data) {
        console.error('Failed to export image/sprite data:', fileInfo)
        return
    }
    let { width, height, raw, rect } = fileInfo.data
    console.log(fileInfo)
    let img = document.createElement('canvas')
    img.width = imgWidth.value = width
    img.height = imgHeight.value = height
    const ctx = img.getContext('2d')
    // 创建ImageData对象
    const imageData = ctx.createImageData(width, height)
    imageData.data.set(raw) // 直接写入数组
    ctx.putImageData(imageData, 0, 0)
    box.value.appendChild(img)
    isSate.value = true
    imgRect.value = rect ? rect : null
}
onMounted(() => {
    nextTick(start)
})
</script>
<style scoped></style>
