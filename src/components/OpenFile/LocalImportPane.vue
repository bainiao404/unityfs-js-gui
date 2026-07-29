<template>
    <div class="pane-content">
        <div class="pane-header">
            <h3 class="pane-title">{{ i18nStore.t('localFileTitle') }}</h3>
            <t-button
                variant="text"
                theme="danger"
                size="small"
                @click="clearLocalFiles"
                :disabled="!localFiles.length"
            >
                {{ i18nStore.t('clearList') }}
            </t-button>
        </div>

        <div class="pane-body">
            <div class="list-container-new">
                <t-list v-slot v-if="localFiles.length > 0" split size="small">
                    <t-list-item v-for="(file, index) in localFiles" :key="index">
                        <t-list-item-main>
                            <div class="file-path-text monospace-text">{{ file.path }}</div>
                            <t-tag size="small" variant="light" :theme="file.type === 'folder' ? 'warning' : 'default'">
                                {{ file.type === 'folder' ? i18nStore.t('addFolder') : i18nStore.t('addFile') }}
                            </t-tag>
                        </t-list-item-main>
                        <template #action>
                            <t-button variant="text" shape="circle" size="small" @click="removeLocalFile(index)">
                                <template #icon><close-icon /></template>
                            </t-button>
                        </template>
                    </t-list-item>
                </t-list>
                <t-empty v-else :description="i18nStore.t('noFilesSelected')" />
            </div>
        </div>

        <div class="pane-footer">
            <div class="action-buttons">
                <t-button variant="outline" @click="handleOpen('file')">
                    <template #icon><file-add-icon /></template>
                    {{ i18nStore.t('addFile') }}
                </t-button>

                <t-button variant="outline" @click="handleOpen('folder')">
                    <template #icon><folder-open-icon /></template>
                    {{ i18nStore.t('addFolder') }}
                </t-button>

                <t-button
                    theme="primary"
                    @click="opneFileStart"
                    :disabled="!localFiles.length"
                    style="margin-left: auto; min-width: 120px"
                >
                    {{ i18nStore.t('startImport') }}
                </t-button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { UnityFSGui } from '@/services/unity/UnityFSGuiService'
import { useConfigStore } from '@/stores/useConfigStore'
import { useAssetStore } from '@/stores/useAssetStore'
import { useI18nStore } from '@/stores/i18n'
import { platform } from '@/utils/platform'
import { MessagePlugin } from 'tdesign-vue-next'
import { CloseIcon, FileAddIcon, FolderOpenIcon } from 'tdesign-icons-vue-next'

const configStore = useConfigStore()
const assetStore = useAssetStore()
const i18nStore = useI18nStore()

const localFiles = computed(() => configStore.data.userOpenFile)

function clearLocalFiles() {
    configStore.data.userOpenFile = []
}

function removeLocalFile(index) {
    configStore.data.userOpenFile.splice(index, 1)
}

async function handleOpen(type) {
    try {
        const selection = await platform.selectFilesOrFolder({ type })
        if (!selection) return

        const items = Array.isArray(selection) ? selection : [selection]
        items.forEach((item) => {
            const cleanPath = item.path
            if (platform.isWeb && item.raw) {
                UnityFSGui.webFileCache.set(cleanPath, item.raw)
            }
            if (!configStore.data.userOpenFile.find((e) => e.path == cleanPath)) {
                configStore.data.userOpenFile.push({
                    path: cleanPath,
                    type: item.type,
                    raw: item.raw || null,
                })
            }
        })
    } catch (err) {
        console.error('选择文件/文件夹失败:', err)
        MessagePlugin.error('选择文件/文件夹失败')
    }
}

async function opneFileStart() {
    if (localFiles.value.length === 0) return
    assetStore.objectUI.isImporting = true
    assetStore.objectUI.importCount = 0

    const historyEntry = {
        id: Date.now(),
        timestamp: Date.now(),
        files: localFiles.value.map((f) => ({ path: f.path, type: f.type })),
    }
    const history = configStore.data.importHistory || []
    configStore.data.importHistory = [historyEntry, ...history].slice(0, 20)

    try {
        await UnityFSGui.openFiles(localFiles.value, (importedCount) => {
            assetStore.objectUI.importCount = importedCount
        })
        assetStore.assetManagerUI.up()
        MessagePlugin.success('导入完成')
    } catch (err) {
        console.error(err)
        MessagePlugin.error('导入失败: ' + err.message)
    } finally {
        assetStore.objectUI.isImporting = false
    }
}
</script>
