<template>
    <div class="single-export-inline">
        <t-dropdown :options="menuOptions" @click="handleMenuClick" :min-column-width="120">
            <t-button variant="text" shape="square" :loading="loading" :disabled="loading" @click.stop>
                <template #icon><t-icon-more /></template>
            </t-button>
        </t-dropdown>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { UnityFSGui } from '@/services/unity/UnityFSGuiService'
import { MessagePlugin } from 'tdesign-vue-next'
import { MoreIcon as TIconMore } from 'tdesign-icons-vue-next'
import { useConfigStore } from '@/stores/useConfigStore'
import { useAssetStore } from '@/stores/useAssetStore'
import { useLayerStore } from '@/layer-system/layerStore'
import { useI18nStore } from '@/stores/i18n'
import { platform } from '@/utils/platform'
import { ExportService } from '@/utils/export/ExportService'

const props = defineProps({
    assetManagerId: { type: [String, Number], required: true },
    objectId: { type: [String, Number], required: true },
    pathID: { type: String, default: null },
})

const configStore = useConfigStore()
const assetStore = useAssetStore()
const layerStore = useLayerStore()
const i18nStore = useI18nStore()
const loading = ref(false)

// Compatibility wrapper for template and callbacks
const appData = {
    config: configStore,
    objectUI: assetStore.objectUI,
    layers: layerStore,
    get webDirectoryHandle() {
        return assetStore.webDirectoryHandle
    },
}

const menuOptions = computed(() => {
    const options = [
        { content: i18nStore.t('export'), value: 'export' },
        { content: i18nStore.t('exportRaw'), value: 'exportRaw' },
        { content: i18nStore.t('binaryViewer'), value: 'binaryViewer' },
        { content: i18nStore.t('objectDetails'), value: 'objectDetails' },
    ]
    if (platform.isElectron) {
        options.push({ content: i18nStore.t('openInExplorer'), value: 'openInExplorer' })
    }
    options.push({ content: i18nStore.t('printInstance'), value: 'printInstance' })
    return options
})

async function handleMenuClick(data) {
    if (data.value === 'export') {
        await handleExportClick(false)
    } else if (data.value === 'exportRaw') {
        await handleExportClick(true)
    } else if (data.value === 'printInstance') {
        await handlePrintInstance()
    } else if (data.value === 'binaryViewer') {
        handleOpenBinaryViewer()
    } else if (data.value === 'objectDetails') {
        handleOpenObjectDetails()
    } else if (data.value === 'openInExplorer') {
        handleOpenInExplorer()
    }
}

function handleOpenInExplorer() {
    if (!platform.isElectron) return
    const assetManagerItem = UnityFSGui.assetManagers.list[props.assetManagerId]
    if (assetManagerItem && assetManagerItem.path) {
        try {
            platform.openInExplorer(assetManagerItem.path)
            MessagePlugin.success('已在资源管理器中定位文件')
        } catch (e) {
            console.error('打开资源管理器失败:', e)
            MessagePlugin.error('无法打开资源管理器')
        }
    } else {
        MessagePlugin.warning('未找到本地文件路径')
    }
}

function handleOpenObjectDetails() {
    appData.layers.addComponent({
        name: 'ObjectDetails',
        props: {
            assetManagerId: props.assetManagerId,
            objectId: props.objectId,
            pathID: props.pathID,
        },
    })
}

function handleOpenBinaryViewer() {
    appData.layers.addComponent({
        name: 'BinaryViewer',
        props: {
            assetManagerId: props.assetManagerId,
            objectId: props.objectId,
        },
    })
}

async function handlePrintInstance() {
    try {
        const assetManager = await UnityFSGui.assetManagers.get(props.assetManagerId)
        const object = props.pathID
            ? assetManager.getObjectInfoByPathId(BigInt(props.pathID))
            : assetManager.getObjectInfos()?.[props.objectId]
        console.log('=== Resource Instance Log ===')
        console.log('Object Info (obj):', object)
        console.log('Asset Manager Instance:', assetManager)
        console.log('=============================')
        MessagePlugin.success('已打印到控制台')
    } catch (err) {
        console.error('打印资源失败:', err)
        MessagePlugin.error(`打印失败: ${err.message}`)
    }
}

/**
 * 主入口
 */
async function handleExportClick(isRaw) {
    if (loading.value) return

    try {
        loading.value = true

        const payload = {
            assetManagerId: props.assetManagerId,
            objectId: props.objectId,
            pathID: props.pathID,
        }

        const success = await ExportService.exportSingle(payload, isRaw)
        if (success) {
            MessagePlugin.success(platform.isWebBrowser && !appData.webDirectoryHandle ? '下载已开始' : '保存成功')
        }
    } catch (err) {
        console.error(err)
        MessagePlugin.error(`导出失败: ${err.message}`)
    } finally {
        loading.value = false
    }
}
</script>

<style scoped>
.single-export-inline {
    display: inline-flex;
    vertical-align: middle;
    align-items: center;
}
</style>
