<template>
    <div class="data-viewer-container">
        <t-loading :loading="loading" show-overlay size="small" class="h-100 w-100">
            <div class="custom-tabs-layout">
                <!-- Custom Navigation Tabs -->
                <div class="custom-tabs-header">
                    <div
                        class="custom-tab-item"
                        :class="{ active: activeTab === 'metadata' }"
                        @click="activeTab = 'metadata'"
                    >
                        基本信息
                    </div>
                    <div class="custom-tab-item" :class="{ active: activeTab === 'json' }" @click="activeTab = 'json'">
                        JSON 数据
                    </div>
                </div>

                <!-- Tabs Content -->
                <div class="result-body-content">
                    <!-- Tab 1: Metadata Card Mode -->
                    <div v-show="activeTab === 'metadata'" class="content-wrapper scrollable-content">
                        <div class="metadata-grid">
                            <!-- Card list -->
                            <div class="meta-cards-container">
                                <div class="meta-card full-width">
                                    <div class="meta-card-label">脚本名称</div>
                                    <div class="meta-card-value class-name">{{ metadata.name || '未命名脚本' }}</div>
                                </div>

                                <div class="meta-card">
                                    <div class="meta-card-label">C# 类名</div>
                                    <div class="meta-card-value">{{ metadata.className || '无' }}</div>
                                </div>

                                <div class="meta-card">
                                    <div class="meta-card-label">命名空间 (Namespace)</div>
                                    <div class="meta-card-value">{{ metadata.namespace || '（无/全局命名空间）' }}</div>
                                </div>

                                <div class="meta-card">
                                    <div class="meta-card-label">目标程序集 (Assembly)</div>
                                    <div class="meta-card-value assembly-name">{{ metadata.assemblyName || '无' }}</div>
                                </div>

                                <div class="meta-card">
                                    <div class="meta-card-label">脚本执行顺序 (Execution Order)</div>
                                    <div class="meta-card-value order-badge">{{ metadata.executionOrder || 0 }}</div>
                                </div>

                                <div class="meta-card full-width">
                                    <div class="meta-card-label">属性哈希值 (Properties Hash)</div>
                                    <div class="meta-card-value hash-value">{{ metadata.propertiesHash || '无' }}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Tab 2: JSON Mode -->
                    <div v-show="activeTab === 'json'" class="content-wrapper">
                        <json-viewer-monaco :data="rawJson" language="json" />
                    </div>
                </div>
            </div>
        </t-loading>
    </div>
</template>

<script setup>
import JsonViewerMonaco from './tools/JsonViewerMonaco.vue'
import { UnityFSGui } from '@/assets/unityfs-gui'
import { onMounted, ref, nextTick } from 'vue'

const props = defineProps(['assetManagerId', 'objectId'])
const metadata = ref({})
const rawJson = ref(null)
const activeTab = ref('metadata')
const loading = ref(true)

async function start() {
    try {
        loading.value = true
        const assetManager = await UnityFSGui.assetManagers.get(props.assetManagerId)
        const objectInfo = assetManager.getObjectInfos()[props.objectId]
        const scriptObj = objectInfo.object

        // Extract metadata from MonoScript class instance
        metadata.value = {
            name: scriptObj.name,
            className: scriptObj.className,
            namespace: scriptObj.namespace,
            assemblyName: scriptObj.assemblyName,
            executionOrder: scriptObj.executionOrder,
            propertiesHash: scriptObj.propertiesHash,
        }

        // Prepare raw JSON dump for inspection
        rawJson.value = JSON.parse(
            JSON.stringify(scriptObj, (key, value) => {
                if (typeof value === 'bigint') {
                    return value.toString()
                }
                return value
            }),
        )
    } catch (e) {
        console.error('加载 MonoScript 失败', e)
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    nextTick(start)
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

.data-viewer-container {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    background-color: #f8fafc;
    overflow: hidden;
    height: 100%;
    width: 100%;
    top: 0px;
    left: 0px;
    font-family:
        'Outfit',
        -apple-system,
        BlinkMacSystemFont,
        'Segoe UI',
        Roboto,
        Helvetica,
        Arial,
        sans-serif;
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
    background-color: #ffffff;
    padding: 0 24px;
    gap: 24px;
    flex-shrink: 0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.custom-tab-item {
    padding: 14px 4px;
    font-size: 14px;
    cursor: pointer;
    color: var(--td-text-color-secondary);
    border-bottom: 2px solid transparent;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
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

.scrollable-content {
    overflow-y: auto;
    padding: 24px;
}

/* Cards Layout */
.metadata-grid {
    max-width: 800px;
    margin: 0 auto;
}

.meta-cards-container {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
}

.meta-card {
    background-color: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    transition: all 0.2s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.01);
}

.meta-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    border-color: #cbd5e1;
}

.meta-card.full-width {
    grid-column: span 2;
}

.meta-card-label {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #64748b;
    font-weight: 600;
}

.meta-card-value {
    font-size: 15px;
    color: #1e293b;
    font-weight: 500;
    word-break: break-all;
}

.meta-card-value.class-name {
    font-size: 18px;
    font-weight: 600;
    color: #4f46e5;
}

.meta-card-value.assembly-name {
    color: #0f766e;
    font-family: monospace;
    font-size: 13px;
}

.meta-card-value.hash-value {
    font-family: monospace;
    font-size: 13px;
    color: #475569;
}

.order-badge {
    background-color: #eff6ff;
    color: #2563eb;
    padding: 2px 10px;
    border-radius: 6px;
    display: inline-block;
    width: fit-content;
    font-weight: 600;
}

.h-100 {
    height: 100%;
}

.w-100 {
    width: 100%;
}

@media (max-width: 640px) {
    .meta-cards-container {
        grid-template-columns: 1fr;
    }

    .meta-card.full-width {
        grid-column: span 1;
    }
}
</style>
