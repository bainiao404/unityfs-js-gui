<script setup>
import AppShell from './layer-system/AppShell.vue'
import AutomaticRefresh from './components/AutomaticRefresh.vue'
import { UnityFSGui } from './assets/unityfs-gui'
import { GKD } from './assets/gkd-js-0.2/index.js'
import { AppData } from './stores/counter'
import { watch, onMounted } from 'vue'
window.UnityFSGui = UnityFSGui
window.GKD = GKD
let mAppData = AppData()

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
// Sync config settings to UnityFSGui asset managers
watch(
    () => mAppData.config.data,
    (val) => {
        UnityFSGui.assetManagers.loadMode = val.loadMode
        UnityFSGui.assetManagers.maxCache = val.maxCache
    },
    { deep: true, immediate: true },
)

onMounted(async () => {
    if (
        mAppData.config.data.autoRestoreLastFile &&
        mAppData.config.data.userOpenFile &&
        mAppData.config.data.userOpenFile.length > 0
    ) {
        const isWeb = !window.__dirname && !window.cordova
        const filesToRestore = mAppData.config.data.userOpenFile.filter((file) => {
            if (isWeb) return !!file.raw
            return true
        })

        if (filesToRestore.length > 0) {
            try {
                mAppData.objectUI.isImporting = true
                await UnityFSGui.openFiles(filesToRestore)
                mAppData.assetManagerUI.up()
            } catch (err) {
                console.error('自动恢复文件失败:', err)
            } finally {
                mAppData.objectUI.isImporting = false
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
