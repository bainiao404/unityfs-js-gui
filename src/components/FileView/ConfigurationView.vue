<template>
    <div class="export-container">
        <t-space direction="vertical" size="large" style="width: 100%">
            <t-card :title="i18nStore.t('importConfigTitle')" header-bordered>
                <t-form label-align="left" label-width="120px">
                    <!-- Language Selection Field -->
                    <t-form-item :label="i18nStore.t('language')">
                        <t-radio-group
                            variant="default-filled"
                            v-model="i18nStore.locale"
                            @change="i18nStore.setLocale"
                        >
                            <t-radio-button value="zh">{{ i18nStore.t('chinese') }}</t-radio-button>
                            <t-radio-button value="en">{{ i18nStore.t('english') }}</t-radio-button>
                        </t-radio-group>
                    </t-form-item>

                    <t-form-item :label="i18nStore.t('modeSelect')">
                        <t-radio-group variant="default-filled" v-model="appData.config.data.loadMode">
                            <t-radio-button :value="0">{{ i18nStore.t('standardMode') }}</t-radio-button>
                            <t-radio-button :value="1">{{ i18nStore.t('lowMemoryMode') }}</t-radio-button>
                        </t-radio-group>
                    </t-form-item>

                    <t-form-item :label="i18nStore.t('maxCache')">
                        <t-space size="large">
                            <t-input-number :max="5" :min="1" v-model="appData.config.data.maxCache" />
                        </t-space>
                    </t-form-item>

                    <t-form-item :label="i18nStore.t('unityVersion')">
                        <t-input
                            v-model="appData.config.data.unityRevision"
                            :placeholder="i18nStore.t('unityVersionPlaceholder')"
                        />
                    </t-form-item>

                    <t-form-item :label="i18nStore.t('unityFsProcess')">
                        <t-checkbox v-model="appData.config.data.sliceBeforeSecondUnityFS">
                            {{ i18nStore.t('cropUnityFsHeader') }}
                        </t-checkbox>
                    </t-form-item>

                    <t-form-item :label="i18nStore.t('autoRestoreLastFile')">
                        <t-checkbox v-model="appData.config.data.autoRestoreLastFile">
                            {{ i18nStore.t('autoRestoreLastFile') }}
                        </t-checkbox>
                    </t-form-item>

                    <t-form-item :label="i18nStore.t('defaultExportPath')" v-if="!(!isCordova && !isElectron)">
                        <div style="display: flex; flex-wrap: wrap; width: 100%; gap: 4px">
                            <t-button variant="outline" @click="setExportDir"> {{ i18nStore.t('browse') }} </t-button>
                            <t-button variant="outline" @click="appData.config.data.lastDefaultSavedDirectory = ''">
                                {{ i18nStore.t('clear') }}
                            </t-button>
                            <t-input
                                style="flex: 1; min-width: 200px"
                                v-model="appData.config.data.lastDefaultSavedDirectory"
                                :placeholder="
                                    appData.config.data.lastDefaultSavedDirectory || i18nStore.t('notSetDownloads')
                                "
                            />
                        </div>
                    </t-form-item>
                </t-form>
            </t-card>
        </t-space>
        <cordova-file-view
            v-if="isCordova"
            :title="i18nStore.t('selectExportFolder')"
            @select="onOpenFileCordova"
            :display="cordovaFileView"
            @close="cordovaFileView = false"
            :onlyFolder="true"
            :multiple="false"
        ></cordova-file-view>
    </div>
</template>

<script setup>
import { AppData } from '@/stores/counter'
import CordovaFileView from '../Class/CordovaFileView/CordovaFileView.vue'
import { ref } from 'vue'
import { useI18nStore } from '@/stores/i18n'

const appData = AppData()
const i18nStore = useI18nStore()
const isCordova = !!window.cordova
const isElectron = !!window.__dirname
const cordovaFileView = ref(false)

function onOpenFileCordova(path) {
    appData.config.data.lastDefaultSavedDirectory = path.path
}

async function setExportDir() {
    if (window.__dirname) {
        const remote = window.require ? window.require('@electron/remote') : null
        if (remote) {
            const { dialog } = remote
            const result = await dialog.showOpenDialog({
                properties: ['openDirectory'],
            })
            if (!result.canceled) {
                appData.config.data.lastDefaultSavedDirectory = result.filePaths[0].replace(/\\/g, '/') + '/'
            }
        }
    } else if (window.cordova) {
        cordovaFileView.value = true
    }
}
</script>

<style scoped>
.export-container {
    padding: 16px;
    max-width: 800px;
    margin: 0 auto;
}
</style>
