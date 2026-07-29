<script setup>
import AppShell from './layer-system/AppShell.vue'
import AutomaticRefresh from './components/AutomaticRefresh.vue'
import { UnityFSGui } from '@/services/unity/UnityFSGuiService'
import { GKD } from './assets/gkd-js-0.2/index.js'
import { useConfigStore } from '@/stores/useConfigStore'
import { useAssetStore } from '@/stores/useAssetStore'
import { platform } from '@/utils/platform'
import { onMounted } from 'vue'

window.UnityFSGui = UnityFSGui
window.GKD = GKD

const configStore = useConfigStore()
const assetStore = useAssetStore()

/**
 * 设置安卓端 Cordova deviceready 监听
 */
if (window.cordova) {
    document.addEventListener('deviceready', function () {
        // StatusBar.show() //显示状态栏
        // StatusBar.overlaysWebView(false)
        // StatusBar.styleDefault() //深色文字浅色背景
        // StatusBar.backgroundColorByHexString('#FFF')
        // window.screen.orientation.lock('portrait-primary')
        // window.screen.orientation.unlock()
    })
}

onMounted(async () => {
    if (
        configStore.data.autoRestoreLastFile &&
        configStore.data.userOpenFile &&
        configStore.data.userOpenFile.length > 0
    ) {
        const filesToRestore = configStore.data.userOpenFile.filter((file) => {
            if (platform.isWeb) return !!file.raw
            return true
        })

        if (filesToRestore.length > 0) {
            try {
                assetStore.objectUI.isImporting = true
                await UnityFSGui.openFiles(filesToRestore)
                assetStore.assetManagerUI.up()
            } catch (err) {
                console.error('自动恢复文件失败:', err)
            } finally {
                assetStore.objectUI.isImporting = false
            }
        }
    }
})
</script>

<template>
    <div style="position: absolute; width: 100%; height: 100%; left: 0px; top: 0px">
        <AutomaticRefresh up-time="2000"></AutomaticRefresh>
        <AppShell></AppShell>
    </div>
</template>
