<template>
    <div class="pane-content">
        <div class="pane-header">
            <h3 class="pane-title">{{ i18nStore.t('webDownloadTitle') }}</h3>
            <t-button
                variant="text"
                theme="danger"
                size="small"
                @click="clearDownloadPath"
                :disabled="!configStore.data.userDownloadPath"
            >
                {{ i18nStore.t('clearInput') }}
            </t-button>
        </div>

        <div class="pane-body flex-body">
            <t-textarea
                v-model="configStore.data.userDownloadPath"
                placeholder="URL..."
                :autosize="{ minRows: 4, maxRows: 6 }"
            />

            <div class="list-title mt-16">URLs ({{ urlList.length }})</div>
            <div class="list-container-new flex-list">
                <t-list v-slot v-if="urlList.length > 0" split size="small">
                    <t-list-item v-for="(url, index) in urlList" :key="index">
                        <div class="url-text monospace-text">{{ url }}</div>
                    </t-list-item>
                </t-list>
                <t-empty v-else description="-" />
            </div>
        </div>

        <div class="pane-footer">
            <t-button theme="primary" block @click="downloadFile" :disabled="!urlList.length">
                <template #icon><download1-icon /></template>
                {{ i18nStore.t('downloadAndImport') }}
            </t-button>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { UnityFSGui } from '@/services/unity/UnityFSGuiService'
import { useConfigStore } from '@/stores/useConfigStore'
import { useI18nStore } from '@/stores/i18n'
import { MessagePlugin } from 'tdesign-vue-next'
import { Download1Icon } from 'tdesign-icons-vue-next'

const configStore = useConfigStore()
const i18nStore = useI18nStore()

const urlList = computed(() => {
    const path = configStore.data.userDownloadPath
    if (!path) return []
    return path
        .split('\n')
        .map((e) => e.trim())
        .filter((e) => e !== '')
})

function clearDownloadPath() {
    configStore.data.userDownloadPath = ''
}

async function downloadFile() {
    if (urlList.value.length === 0) return
    try {
        await UnityFSGui.downloadFiles(urlList.value)
        MessagePlugin.success('下载任务已提交')
    } catch (err) {
        MessagePlugin.error('提交失败: ' + err.message)
    }
}
</script>
<style scoped>
.pane-body {
    margin: 4px;
}
</style>
