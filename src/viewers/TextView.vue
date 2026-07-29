<template>
    <div class="data-viewer-container">
        <t-loading :loading="loading" show-overlay size="small" class="h-100 w-100">
            <div class="custom-tabs-layout">
                <!-- Custom Navigation Tabs -->
                <div class="custom-tabs-header">
                    <div class="custom-tab-item" :class="{ active: activeTab === 'text' }" @click="activeTab = 'text'">
                        文本模式
                    </div>
                    <div class="custom-tab-item" :class="{ active: activeTab === 'json' }" @click="activeTab = 'json'">
                        JSON 模式
                    </div>
                </div>

                <!-- Tabs Content -->
                <div class="result-body-content">
                    <!-- Tab 1: Text Mode -->
                    <div v-show="activeTab === 'text'" class="content-wrapper">
                        <json-viewer-monaco :data="text || '暂无数据'" language="plaintext" />
                    </div>

                    <!-- Tab 2: JSON Mode -->
                    <div v-show="activeTab === 'json'" class="content-wrapper">
                        <json-viewer-monaco :data="textJson" language="json" />
                    </div>
                </div>
            </div>
        </t-loading>
    </div>
</template>

<script setup>
import JsonViewerMonaco from '../tools/JsonViewerMonaco.vue'
import { UnityFSGui } from '@/services/unity/UnityFSGuiService'
import { onMounted, ref, nextTick } from 'vue'
import { useAssetStore } from '@/stores/useAssetStore'
import { useLayerStore } from '@/layer-system/layerStore'
import SimpleSpine from '@/assets/SimpleSpine-0.2/index.js'

const assetStore = useAssetStore()
const layerStore = useLayerStore()
const props = defineProps(['assetManagerId', 'objectId'])
const text = ref('')
const textJson = ref(null)
const activeTab = ref('text')
const loading = ref(true)

async function start() {
    try {
        loading.value = true
        const assetManager = await UnityFSGui.assetManagers.get(props.assetManagerId)
        const object = assetManager.getObjectInfos()[props.objectId]
        const fileInfo = await assetManager.exportFile(object)

        text.value = fileInfo.data.raw
        let spineVersion = null
        try {
            textJson.value = JSON.parse(fileInfo.data.raw)
            activeTab.value = 'json'
            spineVersion = SimpleSpine.isVersion(textJson.value)
        } catch {
            textJson.value = fileInfo.data.raw
            spineVersion = SimpleSpine.isVersion(fileInfo.data.raw)
        }
        if (spineVersion) {
            assetStore.spineView.add([props.assetManagerId, props.objectId])
            layerStore.permanent.spineView = true
        }
        console.log(spineVersion)
    } catch (e) {
        console.error('加载失败', e)
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    nextTick(start)
})
</script>

<style scoped>
/* 容器：纯白背景 */
.data-viewer-container {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    background-color: #ffffff;
    overflow: hidden;
    height: 100%;
    width: 100%;
    top: 0px;
    left: 0px;
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
    background-color: var(--td-bg-color-container);
    padding: 0 20px;
    gap: 24px;
    flex-shrink: 0;
}

.custom-tab-item {
    padding: 12px 4px;
    font-size: 14px;
    cursor: pointer;
    color: var(--td-text-color-secondary);
    border-bottom: 2px solid transparent;
    transition: all 0.2s ease;
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

.h-100 {
    height: 100%;
}

.w-100 {
    width: 100%;
}
</style>
