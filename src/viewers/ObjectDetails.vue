<template>
    <div class="data-viewer-container">
        <t-loading :loading="loading" show-overlay size="small" class="custom-tabs">
            <t-tabs v-model="activeTab">
                <t-tab-panel value="basic" label="基本信息" :destroy-on-hide="false">
                    <div class="content-wrapper">
                        <div class="details-grid">
                            <div class="details-row" v-for="field in basicFields" :key="field.label">
                                <div class="details-label">{{ field.label }}</div>
                                <div class="details-value-container">
                                    <span class="details-value">{{ field.value }}</span>
                                    <t-button
                                        v-if="field.value && field.value !== '无' && field.value !== '无路径'"
                                        variant="text"
                                        shape="square"
                                        size="small"
                                        @click="copyText(field.value, field.label)"
                                    >
                                        <template #icon><t-icon-copy /></template>
                                    </t-button>
                                </div>
                            </div>
                        </div>
                    </div>
                </t-tab-panel>
                <t-tab-panel value="json" label="JSON 属性" :destroy-on-hide="false">
                    <div class="content-wrapper light-bg">
                        <div class="json-header">
                            <t-button variant="outline" size="small" @click="copyJson">
                                <template #icon><t-icon-copy /></template>
                                复制 JSON
                            </t-button>
                        </div>
                        <json-viewer :data="objectJson" class="light-json"></json-viewer>
                    </div>
                </t-tab-panel>
            </t-tabs>
        </t-loading>
    </div>
</template>

<script setup>
import '@alenaksu/json-viewer'
import { UnityFSGui } from '@/services/unity/UnityFSGuiService'
import { onMounted, ref, computed } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import { CopyIcon as TIconCopy } from 'tdesign-icons-vue-next'

const props = defineProps({
    assetManagerId: { type: [String, Number], required: true },
    objectId: { type: [String, Number], required: true },
    pathID: { type: String, default: null },
})

const activeTab = ref('basic')
const loading = ref(true)
const objectData = ref(null)
const objectJson = ref(null)

const basicFields = computed(() => {
    if (!objectData.value) return []
    return [
        { label: '名称 (Name)', value: objectData.value.name || '无' },
        { label: '类型 (Class Name)', value: objectData.value.className || '无' },
        { label: '大小 (Size)', value: objectData.value.size !== undefined ? `${objectData.value.size} 字节` : '未知' },
        {
            label: '文件内偏移 (Offset)',
            value: objectData.value.offset !== undefined ? `${objectData.value.offset} 字节` : '未知',
        },
        { label: 'Path ID', value: objectData.value.pathID ? String(objectData.value.pathID) : '无' },
        { label: '导出后缀 (Extension)', value: objectData.value.exportExtension || '无' },
        { label: '资产包路径 (Asset Path)', value: objectData.value.path || '无路径' },
        { label: '管理器 ID', value: String(props.assetManagerId) },
        { label: '资源 ID', value: String(props.objectId) },
    ]
})

async function start() {
    try {
        loading.value = true
        const assetManager = await UnityFSGui.assetManagers.get(props.assetManagerId)

        // 优先用 pathID 精确定位，防止大文件中索引偏移
        const object = props.pathID
            ? assetManager.getObjectInfoByPathId(BigInt(props.pathID))
            : assetManager.getObjectInfos()?.[props.objectId]

        if (object) {
            objectData.value = {
                name: object.name,
                className: object.className,
                size: object.size,
                offset: object.offset,
                pathID: object.pathID,
                exportExtension: object.exportExtension,
                path: object.path,
            }

            // 构建序列化 JSON 副本
            const serialized = {}
            for (const key in object) {
                if (key.startsWith('_')) continue // 排除内部下划线私有变量/循环引用
                const val = object[key]
                if (typeof val === 'bigint') {
                    serialized[key] = String(val)
                } else if (typeof val !== 'function' && typeof val !== 'object') {
                    serialized[key] = val
                }
            }
            // 补充 object 属性详情内字段 (如存在且可序列化)
            if (object.object) {
                serialized.details = {}
                for (const key in object.object) {
                    if (key.startsWith('_')) continue
                    const val = object.object[key]
                    if (typeof val === 'bigint') {
                        serialized.details[key] = String(val)
                    } else if (typeof val !== 'function' && typeof val !== 'object') {
                        serialized.details[key] = val
                    }
                }
            }
            objectJson.value = serialized
        }
    } catch (e) {
        console.error('加载详情失败', e)
        MessagePlugin.error('加载资源详情失败')
    } finally {
        loading.value = false
    }
}

async function copyText(text, label) {
    try {
        await navigator.clipboard.writeText(text)
        MessagePlugin.success(`复制 ${label.split(' ')[0]} 成功`)
    } catch (err) {
        MessagePlugin.error('复制失败')
    }
}

async function copyJson() {
    try {
        if (!objectJson.value) return
        await navigator.clipboard.writeText(JSON.stringify(objectJson.value, null, 4))
        MessagePlugin.success('复制 JSON 成功')
    } catch (err) {
        MessagePlugin.error('复制失败')
    }
}

onMounted(() => {
    start()
})
</script>

<style scoped>
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

.custom-tabs {
    height: 100%;
}

.content-wrapper {
    height: 100%;
    overflow: auto;
    padding: 20px;
    box-sizing: border-box;
}

.details-grid {
    display: flex;
    flex-direction: column;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    background-color: #ffffff;
}

.details-row {
    display: flex;
    border-bottom: 1px solid #d0d7de;
    min-height: 44px;
    align-items: center;
}

.details-row:last-child {
    border-bottom: none;
}

.details-label {
    width: 180px;
    padding: 10px 16px;
    font-weight: 600;
    color: #57606a;
    background-color: #f6f8fa;
    border-right: 1px solid #d0d7de;
    flex-shrink: 0;
}

.details-value-container {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: space-between;
    padding: 6px 16px;
    word-break: break-all;
}

.details-value {
    color: #24292f;
    font-family:
        ui-monospace,
        SFMono-Regular,
        SF Mono,
        Menlo,
        Consolas,
        monospace;
    font-size: 13px;
}

.json-header {
    margin-bottom: 12px;
    display: flex;
    justify-content: flex-end;
}

/* JSON Viewer 样式 */
.light-json {
    --background-color: #ffffff;
    --color: #24292f;
    --font-family: ui-monospace, monospace;
    --font-size: 14px;
    --indent-size: 1.5em;
    --indentguide-color: #eee;
    --property-color: #0550ae;
    --string-color: #0a3069;
    --number-color: #cf222e;
    --boolean-color: #116329;
    --null-color: #6e7781;
    --preview-color: #6e7781;
}

/* 滚动条美化 */
.content-wrapper::-webkit-scrollbar {
    width: 6px;
}
.content-wrapper::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 10px;
}
.content-wrapper::-webkit-scrollbar-track {
    background: transparent;
}

.custom-tabs ::v-slot(.t-tabs__content) {
    overflow: auto;
    position: absolute;
    height: calc(100% - 40px);
    width: 100%;
}

.custom-tabs :deep(.t-tabs__content) {
    overflow: auto;
    position: absolute;
    height: calc(100% - 40px);
    width: 100%;
}

.custom-tabs :deep(.t-tabs__nav-scroll) {
    justify-content: center;
    height: 40px;
}

.custom-tabs :deep(.t-tabs__bar) {
    transform: scaleX(0.5);
    background-color: #212c37;
}

.custom-tabs :deep(.t-tabs__nav-wrap) {
    height: 40px;
}

.custom-tabs :deep(.t-tabs__nav-item) {
    height: 40px;
}

.custom-tabs :deep(.t-is-active) {
    color: #212c37;
}

.custom-tabs :deep(.t-tabs__nav-container.t-is-top:after) {
    display: none !important;
}
</style>
