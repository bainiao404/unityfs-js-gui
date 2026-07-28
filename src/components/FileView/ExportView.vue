<template>
    <div style="position: absolute; width: 100%; height: 100%; overflow-y: auto; overflow-x: hidden">
        <div class="export-container">
            <t-space direction="vertical" size="large" style="width: 100%">
                <t-card :title="i18nStore.t('exportConfigTitle')" header-bordered>
                    <t-form label-align="left" :data="appData.config.data" label-width="120px">
                        <t-form-item :label="i18nStore.t('exportScope')">
                            <t-radio-group variant="default-filled" v-model="appData.config.data.exportScope">
                                <t-radio-button :value="0">{{ i18nStore.t('allFiles') }}</t-radio-button>
                                <t-radio-button :value="1">{{ i18nStore.t('currentList') }}</t-radio-button>
                                <t-radio-button :value="2"
                                    >{{ i18nStore.t('selectedFiles') }} ({{ selectedFilesCount }})</t-radio-button
                                >
                            </t-radio-group>
                        </t-form-item>

                        <t-form-item :label="i18nStore.t('duplicateFiles')">
                            <t-radio-group variant="default-filled" v-model="appData.config.data.sameName">
                                <t-radio-button :value="0">{{ i18nStore.t('keepLarger') }}</t-radio-button>
                                <t-radio-button :value="1">{{ i18nStore.t('rename') }}</t-radio-button>
                            </t-radio-group>
                        </t-form-item>

                        <t-form-item :label="i18nStore.t('exportMode')">
                            <t-radio-group variant="default-filled" v-model="appData.config.data.exportMode">
                                <t-radio-button value="standard">{{ i18nStore.t('decodedExport') }}</t-radio-button>
                                <t-radio-button value="raw">{{ i18nStore.t('rawExport') }}</t-radio-button>
                            </t-radio-group>
                        </t-form-item>

                        <t-form-item
                            :label="i18nStore.t('spriteOption')"
                            v-if="appData.config.data.exportMode !== 'raw'"
                        >
                            <t-space size="large">
                                <t-check-tag
                                    :checked="appData.config.data.spriteCutting"
                                    @change="appData.config.data.spriteCutting = $event"
                                    >{{ i18nStore.t('cropImage') }}</t-check-tag
                                >
                                <t-check-tag
                                    :checked="appData.config.data.exportSpritePositionJson"
                                    @change="appData.config.data.exportSpritePositionJson = $event"
                                    >{{ i18nStore.t('exportPosJson') }}</t-check-tag
                                >
                            </t-space>
                        </t-form-item>

                        <t-form-item :label="i18nStore.t('parallelTasks')">
                            <t-input-number
                                :disabled="isCordova"
                                :max="8"
                                :min="1"
                                v-model="appData.config.data.maxTask"
                            />
                        </t-form-item>

                        <t-form-item :label="i18nStore.t('outputDirectory')">
                            <div style="display: flex; flex-wrap: wrap; width: 100%; gap: 4px">
                                <t-button variant="outline" @click="setExportDir">
                                    {{ i18nStore.t('browse') }}
                                </t-button>
                                <t-button v-if="needsAuth" theme="warning" variant="base" @click="requestWebPermission">
                                    {{ i18nStore.t('reauthorize') }}
                                </t-button>
                                <t-button variant="outline" @click="clearExportDir">
                                    {{ i18nStore.t('clear') }}
                                </t-button>
                                <t-input
                                    style="flex: 1; min-width: 200px"
                                    v-model="appData.config.data.lastSavedDirectory"
                                    :readonly="isWebBrowser"
                                    :status="needsAuth ? 'warning' : 'default'"
                                    :placeholder="
                                        isWebBrowser
                                            ? i18nStore.t('outputDirPlaceholderWeb')
                                            : i18nStore.t('outputDirPlaceholderNative')
                                    "
                                />
                            </div>
                        </t-form-item>
                    </t-form>

                    <template #footer>
                        <div style="display: flex; gap: 12px; width: 100%">
                            <t-button theme="primary" :loading="isExporting" @click="exportStart" style="flex: 1">
                                <template #icon><t-icon-download v-if="!isExporting" /></template>
                                {{ needsAuth ? i18nStore.t('authAndExport') : i18nStore.t('startExecutionExport') }}
                            </t-button>
                            <t-button
                                theme="warning"
                                variant="outline"
                                :loading="isExporting"
                                @click="exportLive2DStart"
                                style="flex: 1"
                            >
                                <template #icon><t-icon-download v-if="!isExporting" /></template>
                                {{ i18nStore.t('exportLive2D') }}
                            </t-button>
                        </div>
                    </template>
                </t-card>

                <t-card
                    v-if="logList.length > 0 || isExporting"
                    :title="i18nStore.t('executionLogs')"
                    :header-bordered="true"
                >
                    <template #actions>
                        <t-button variant="text" shape="square" @click="logList = []"><t-icon-delete /></t-button>
                    </template>
                    <div class="log-console">
                        <div class="log-line" v-if="logCurrent">
                            <span class="log-time">[{{ logCurrent.time }}]</span>
                            <span :class="['log-text', logCurrent.text.includes('√') ? 'success' : '']">{{
                                logCurrent.text
                            }}</span>
                        </div>
                        <div v-for="(log, index) in logList" :key="index" class="log-line">
                            <span class="log-time">[{{ log.time }}]</span>
                            <span :class="['log-text', log.text.includes('√') ? 'success' : '']">{{ log.text }}</span>
                        </div>
                    </div>
                    <t-progress v-if="isExporting" theme="line" :percentage="exportProgress" class="mt-2" />
                </t-card>
            </t-space>

            <CordovaFileView
                v-if="platform.isCordova"
                :title="i18nStore.t('exportSelectFolderTitle')"
                @select="onOpenFileCordova"
                :display="platform.cordovaFileViewVisible.value"
                @close="closeCordovaFileView"
                :onlyFolder="true"
                :multiple="false"
            />
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { AppData } from '@/stores/counter'
import { UnityFSGui } from '@/assets/unityfs-gui'
import CordovaFileView from '../Class/CordovaFileView/CordovaFileView.vue'
import { MessagePlugin } from 'tdesign-vue-next'
import { DownloadIcon as TIconDownload, DeleteIcon as TIconDelete } from 'tdesign-icons-vue-next'
import { useI18nStore } from '@/stores/i18n'
import { FileHandleStorage } from '@/utils/fs/FileHandleStorage'
import { ExportService } from '@/utils/export/ExportService'
import { platform } from '@/utils/platform'

const appData = AppData()
const i18nStore = useI18nStore()

// 响应式状态
const logList = ref([])
const isExporting = ref(false)
const exportProgress = ref(0)
const logCurrent = ref(null)
const webDirectoryHandle = computed({
    get: () => appData.webDirectoryHandle,
    set: (val) => (appData.webDirectoryHandle = val),
})
const hasWebPermission = computed({
    get: () => appData.hasWebPermission,
    set: (val) => (appData.hasWebPermission = val),
})

// 平台判断从 platform 统一读取
const isWebBrowser = computed(() => platform.isWebBrowser)
const isCordova = computed(() => platform.isCordova)

// 是否需要重新授权按钮
const needsAuth = computed(() => {
    return isWebBrowser.value && webDirectoryHandle.value && !hasWebPermission.value
})

const selectedFilesCount = computed(() => {
    return appData.objectUI.list.filter((item) => item.selected).length
})

// 组件挂载时恢复
onMounted(async () => {
    ExportService.init(appData, i18nStore)
    if (isWebBrowser.value) {
        const handle = await FileHandleStorage.getSavedDirectoryHandle()
        if (handle) {
            webDirectoryHandle.value = handle
            // 检查初始权限状态
            hasWebPermission.value = await FileHandleStorage.verifyPermission(handle, false)
            appData.config.data.lastSavedDirectory = hasWebPermission.value
                ? `[本地] ${handle.name}/`
                : `[待授权] ${handle.name}/`
        }
    }
})

const ExportMap = {
    Texture2D: {},
    MonoBehaviour: {},
    TextAsset: {},
    Sprite: {},
    AudioClip: {},
    CubismModel: {},
}

function onOpenFileCordova(selection) {
    const item = Array.isArray(selection) ? selection[0] : selection
    if (item && item.path) {
        appData.config.data.lastSavedDirectory = item.path
    }
    if (typeof platform.resolveSelection === 'function') {
        platform.resolveSelection(selection)
    }
}

function closeCordovaFileView() {
    platform.cordovaFileViewVisible.value = false
    if (typeof platform.resolveSelection === 'function') {
        platform.resolveSelection(null)
    }
}

async function clearExportDir() {
    appData.config.data.lastSavedDirectory = ''
    webDirectoryHandle.value = null
    hasWebPermission.value = false
    await FileHandleStorage.clearDirectoryHandle()
}

// 重新授权方法
async function requestWebPermission() {
    if (!webDirectoryHandle.value) return false
    try {
        const granted = await FileHandleStorage.verifyPermission(webDirectoryHandle.value, true)
        if (granted) {
            hasWebPermission.value = true
            appData.config.data.lastSavedDirectory = `[本地] ${webDirectoryHandle.value.name}/`
            MessagePlugin.success(i18nStore.t('authSuccess'))
            return true
        }
        return false
    } catch (err) {
        MessagePlugin.error(i18nStore.t('authFailed') + ': ' + err.message)
        return false
    }
}

let log = {
    list: [],
    cycleCall: createCycleDebounce(),
    add: function (text, type = 'default') {
        let info = { text: text, time: new Date().toLocaleTimeString(), type: type }
        if (type == 'stage') {
            logList.value.push(info)
        }
        if (type != 'end') {
            this.cycleCall(() => {
                logCurrent.value = info
            }, 500)
        }
        this.list.unshift(info)
    },
    clear: function () {
        this.list.length = 0
        logList.value.length = 0
        logCurrent.value = null
    },
    print: function () {
        logCurrent.value = null
        logList.value = [...this.list]
    },
}

async function exportStart() {
    // Web 端校验权限
    if (isWebBrowser.value && webDirectoryHandle.value && !hasWebPermission.value) {
        const authed = await requestWebPermission()
        if (!authed) return
    }

    const outDir = appData.config.data.lastSavedDirectory || appData.config.data.lastDefaultSavedDirectory
    if (!isWebBrowser.value && !outDir) {
        MessagePlugin.warning('请先选择导出文件夹')
        return
    }

    try {
        isExporting.value = true
        exportProgress.value = 0
        log.clear()
        log.add(i18nStore.t('exportProcessLogs'), 'stage')

        let baseList
        if (appData.config.data.exportScope === 0) {
            baseList = appData.objectUI.list
        } else if (appData.config.data.exportScope === 1) {
            baseList = appData.objectUI.currentList
        } else {
            baseList = appData.objectUI.list.filter((item) => item.selected)
        }
        const isRawMode = appData.config.data.exportMode === 'raw'
        const exportObjects = baseList.filter((e) => {
            if (isRawMode) {
                return e.className
            }
            return e.className && ExportMap[e.className]
        })

        if (exportObjects.length === 0) {
            log.add(i18nStore.t('noExportableAssets'), 'stage')
            isExporting.value = false
            return
        }

        exportObjects.sort((e, e1) => e.viewId.localeCompare(e1.viewId))

        await ExportService.exportBulk(
            exportObjects,
            isRawMode,
            (completed, total) => {
                exportProgress.value = Math.round((completed / total) * 100)
            },
            log,
        )

        log.add('√ Complete!', 'end')
        log.print()
        MessagePlugin.success(i18nStore.t('exportSuccess'))
    } catch (err) {
        log.add('❌ Error: ' + err.message)
        MessagePlugin.error(i18nStore.t('exportFailed'))
    } finally {
        isExporting.value = false
    }
}

async function exportLive2DStart() {
    // Web 端校验权限
    if (isWebBrowser.value && webDirectoryHandle.value && !hasWebPermission.value) {
        const authed = await requestWebPermission()
        if (!authed) return
    }

    const outDir = appData.config.data.lastSavedDirectory || appData.config.data.lastDefaultSavedDirectory
    if (!isWebBrowser.value && !outDir) {
        MessagePlugin.warning('请先选择导出文件夹')
        return
    }

    try {
        isExporting.value = true
        exportProgress.value = 0
        log.clear()
        log.add('开始导出 Live2D 模型...', 'stage')

        let baseList
        if (appData.config.data.exportScope === 0) {
            baseList = appData.objectUI.list
        } else if (appData.config.data.exportScope === 1) {
            baseList = appData.objectUI.currentList
        } else {
            baseList = appData.objectUI.list.filter((item) => item.selected)
        }

        const exportObjects = []
        for (const e of baseList) {
            if (e.className === 'CubismModel') {
                exportObjects.push(e)
            } else if (e.className === 'MonoBehaviour') {
                try {
                    const assetManager = await UnityFSGui.assetManagers.get(e.assetManagerId)
                    const objectInfos = assetManager.getObjectInfos()
                    const objectInfo = objectInfos[e.objectId]
                    if (objectInfo) {
                        const monoData = objectInfo.assetFile?.getObjectUsingTreeJSON(objectInfo)
                        if (monoData && (monoData._moc !== undefined || monoData.m_Moc !== undefined)) {
                            exportObjects.push(e)
                        }
                    }
                } catch {
                    // ignore
                }
            }
        }

        if (exportObjects.length === 0) {
            log.add('⚠ 未找到可导出的 Live2D 模型 (CubismModel)', 'stage')
            isExporting.value = false
            return
        }

        exportObjects.sort((e, e1) => e.viewId.localeCompare(e1.viewId))

        await ExportService.exportLive2D(
            exportObjects,
            (completed, total) => {
                exportProgress.value = Math.round((completed / total) * 100)
            },
            log,
        )

        log.add('√ Complete!', 'end')
        log.print()
        MessagePlugin.success(i18nStore.t('exportSuccess'))
    } catch (err) {
        log.add('❌ Error: ' + err.message)
        MessagePlugin.error(i18nStore.t('exportFailed'))
    } finally {
        isExporting.value = false
    }
}

async function setExportDir() {
    try {
        const result = await platform.selectDirectory()
        if (!result) return

        if (platform.isWebBrowser) {
            webDirectoryHandle.value = result
            hasWebPermission.value = true
            appData.config.data.lastSavedDirectory = `[本地] ${result.name}/`
            await FileHandleStorage.saveDirectoryHandle(result)
            MessagePlugin.success(`Connected to: ${result.name}`)
        } else {
            appData.config.data.lastSavedDirectory = result
        }
    } catch (err) {
        console.error(err)
        MessagePlugin.error('选择目录失败: ' + err.message)
    }
}

function createCycleDebounce() {
    let timer = null
    let lastCallback = null
    return function (callback, wait) {
        lastCallback = callback
        if (timer) return
        timer = setTimeout(() => {
            if (lastCallback) lastCallback()
            timer = null
            lastCallback = null
        }, wait)
    }
}
</script>

<style scoped>
.export-container {
    padding: 14px;
    max-width: 800px;
    margin: 0 auto;
}
.log-console {
    background: #f8f9fa;
    color: #212529;
    padding: 12px;
    border: 1px solid var(--td-component-border);
    height: 240px;
    overflow-y: auto;
    font-family: 'Cascadia Code', Consolas, monospace;
    font-size: 12px;
    line-height: 1.6;
}
.log-line {
    margin-bottom: 4px;
    border-bottom: 1px solid var(--td-component-border);
}
.log-time {
    color: var(--td-brand-color);
    margin-right: 8px;
}
.log-text.success {
    color: #008060;
    font-weight: bold;
}
.mt-2 {
    margin-top: 12px;
}
</style>
