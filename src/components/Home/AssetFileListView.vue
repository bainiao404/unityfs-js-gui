<template>
    <div class="properties-container">
        <div v-if="assetFileList.length === 0" class="no-files-placeholder">
            {{ i18nStore.t('noFilesSelected') }}
        </div>
        <div v-else class="property-cards-list">
            <div v-for="(assetFile, index) in assetFileList" :key="index" class="property-card">
                <div class="property-header">
                    <span class="file-index">#{{ index + 1 }} - {{ assetFile.name || 'Unnamed Asset' }}</span>
                    <span class="file-platform-tag">{{ formatPlatform(assetFile.targetPlatform) }}</span>
                </div>
                <div v-if="assetFile.path" class="property-path-container">
                    <span class="property-label">{{ i18nStore.t('filePath') }}</span>
                    <span class="property-value monospace path-text">{{ assetFile.path }}</span>
                </div>
                <div class="property-grid">
                    <div class="property-item">
                        <span class="property-label">{{ i18nStore.t('unityVersion') }}</span>
                        <span class="property-value monospace">{{ assetFile.unityRevision || 'N/A' }}</span>
                    </div>
                    <div class="property-item">
                        <span class="property-label">{{ i18nStore.t('fileSize') }}</span>
                        <span class="property-value monospace">{{ formatBytes(assetFile.fileSize) }}</span>
                    </div>
                    <div class="property-item">
                        <span class="property-label">{{ i18nStore.t('assetVersion') }}</span>
                        <span class="property-value monospace">v{{ assetFile.version || 'N/A' }}</span>
                    </div>
                    <div class="property-item">
                        <span class="property-label">{{ i18nStore.t('endianness') }}</span>
                        <span class="property-value">{{
                            assetFile.endianness === 0 ? 'Little Endian' : 'Big Endian'
                        }}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { watch, ref } from 'vue'
import { UnityFSGui } from '@/assets/unityfs-gui'
import { AppData } from '@/stores/counter'
import { useI18nStore } from '@/stores/i18n'

const mAppData = AppData()
const i18nStore = useI18nStore()
const assetFileList = ref([])

// Map targetPlatform IDs to readable strings
const platformMap = {
    4: 'OSXIntel64',
    9: 'iOS',
    13: 'Android',
    19: 'WebGL',
    20: 'WSAPlayer',
    24: 'WindowsStandalone64',
    28: 'XboxOne',
    30: 'PS4',
    38: 'Switch',
}

function formatPlatform(platform) {
    return platformMap[platform] || `Unknown (${platform})`
}

function formatBytes(bytes, decimals = 2) {
    if (!bytes) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

function upView() {
    let list = []
    let assetManagers = UnityFSGui.assetManagers.list
    for (let i = 0; i < assetManagers.length; i++) {
        let assetManager = assetManagers[i]
        if (assetManager.info) {
            list.push(assetManager.info)
        }
    }
    assetFileList.value = list
}

// Watch both upTime (start of load) and objectUI.list (completion of load)
watch(
    [() => mAppData.assetManagerUI.upTime, () => mAppData.objectUI.list],
    () => {
        upView()
    },
    { immediate: true },
)
</script>

<style scoped>
.properties-container {
    height: 100%;
    overflow-y: auto;
    background-color: var(--td-bg-color-container);
    padding: 16px;
    box-sizing: border-box;
}

.no-files-placeholder {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 200px;
    color: var(--td-text-color-placeholder);
    font-size: 14px;
    border: 1px dashed var(--td-component-stroke);
    border-radius: 0px;
}

.property-cards-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.property-card {
    border: 1px solid var(--td-component-stroke);
    background-color: var(--td-bg-color-secondarycontainer);
    border-radius: 0px;
    padding: 12px 16px;
}

.property-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    border-bottom: 1px solid var(--td-component-stroke);
    padding-bottom: 8px;
}

.file-index {
    font-weight: bold;
    font-size: 14px;
    color: var(--td-brand-color);
}

.file-platform-tag {
    font-size: 12px;
    font-weight: 600;
    background-color: var(--td-brand-color-light);
    color: var(--td-brand-color);
    padding: 2px 8px;
    border-radius: 0px;
}

.property-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
}

.property-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.property-label {
    font-size: 12px;
    color: var(--td-text-color-placeholder);
}

.property-value {
    font-size: 14px;
    color: var(--td-text-color-primary);
}

.monospace {
    font-family: 'Cascadia Code', Consolas, Monaco, monospace;
}

.property-path-container {
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px dashed var(--td-component-stroke);
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.path-text {
    word-break: break-all;
    font-size: 13px;
    color: var(--td-text-color-secondary);
}
</style>
