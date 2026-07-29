<template>
    <div class="pane-content">
        <div class="pane-header">
            <h3 class="pane-title">{{ i18nStore.t('historyRecords') }}</h3>
            <t-button
                variant="text"
                theme="danger"
                size="small"
                @click="clearHistory"
                :disabled="!configStore.data.importHistory || !configStore.data.importHistory.length"
            >
                {{ i18nStore.t('clearHistory') }}
            </t-button>
        </div>

        <div class="pane-body">
            <div class="list-container-new history-container">
                <t-list
                    v-slot
                    v-if="configStore.data.importHistory && configStore.data.importHistory.length > 0"
                    split
                    size="small"
                >
                    <t-list-item v-for="entry in configStore.data.importHistory" :key="entry.id">
                        <t-list-item-main>
                            <div class="history-time monospace-text">
                                {{ formatTime(entry.timestamp) }}
                            </div>
                            <div class="history-files-list">
                                <div
                                    v-for="(file, fIdx) in expandedHistoryItems[entry.id]
                                        ? entry.files
                                        : entry.files.slice(0, 3)"
                                    :key="fIdx"
                                    class="history-file-item monospace-text"
                                >
                                    <file1-icon style="font-size: 14px" /> {{ file.path }}
                                </div>
                                <div v-if="entry.files && entry.files.length > 3">
                                    <t-link
                                        theme="primary"
                                        style="
                                            cursor: pointer;
                                            display: inline-flex;
                                            align-items: center;
                                            gap: 2px;
                                            margin-top: 4px;
                                            font-size: 12px;
                                        "
                                        @click="toggleExpand(entry.id)"
                                    >
                                        <chevron-up-icon v-if="expandedHistoryItems[entry.id]" />
                                        <chevron-down-icon v-else />
                                        {{
                                            expandedHistoryItems[entry.id]
                                                ? i18nStore.t('collapse')
                                                : `${i18nStore.t('expandAll')} (${entry.files.length})`
                                        }}
                                    </t-link>
                                </div>
                            </div>
                        </t-list-item-main>
                        <template #action>
                            <t-button variant="outline" size="small" @click="restoreHistoryEntry(entry)">
                                {{ i18nStore.t('restoreHistory') }}
                            </t-button>
                        </template>
                    </t-list-item>
                </t-list>
                <t-empty v-else :description="i18nStore.t('noHistory')" />
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { UnityFSGui } from '@/services/unity/UnityFSGuiService'
import { useConfigStore } from '@/stores/useConfigStore'
import { useAssetStore } from '@/stores/useAssetStore'
import { useI18nStore } from '@/stores/i18n'
import { platform } from '@/utils/platform'
import { MessagePlugin } from 'tdesign-vue-next'
import { File1Icon, ChevronUpIcon, ChevronDownIcon } from 'tdesign-icons-vue-next'

const configStore = useConfigStore()
const assetStore = useAssetStore()
const i18nStore = useI18nStore()

const expandedHistoryItems = ref({})
const toggleExpand = (id) => {
    expandedHistoryItems.value[id] = !expandedHistoryItems.value[id]
}

function clearHistory() {
    configStore.data.importHistory = []
}

function formatTime(timestamp) {
    const d = new Date(timestamp)
    const padding = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${padding(d.getMonth() + 1)}-${padding(d.getDate())} ${padding(d.getHours())}:${padding(d.getMinutes())}:${padding(d.getSeconds())}`
}

async function restoreHistoryEntry(entry) {
    assetStore.objectUI.isImporting = true
    assetStore.objectUI.importCount = 0

    try {
        const isWeb = platform.isWeb
        const filesToOpen = entry.files.map((f) => {
            const restored = { path: f.path, type: f.type }
            if (isWeb) {
                const cachedRaw = UnityFSGui.webFileCache.get(f.path)
                if (cachedRaw) {
                    restored.raw = cachedRaw
                } else {
                    throw new Error(
                        `Web端刷新后无法恢复本地文件: ${f.path}，请重新选择文件。但在 Electron/Cordova 平台支持完全恢复。`,
                    )
                }
            }
            return restored
        })

        configStore.data.userOpenFile = filesToOpen

        await UnityFSGui.openFiles(filesToOpen, (importedCount) => {
            assetStore.objectUI.importCount = importedCount
        })
        assetStore.assetManagerUI.up()
        MessagePlugin.success('恢复导入完成')
    } catch (err) {
        console.error(err)
        MessagePlugin.error(err.message)
    } finally {
        assetStore.objectUI.isImporting = false
    }
}
</script>
