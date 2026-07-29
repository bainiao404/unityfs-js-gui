<template>
    <div class="pane-content">
        <div class="pane-header">
            <h3 class="pane-title">{{ i18nStore.t('downloadProgress') }}</h3>
        </div>

        <div class="pane-body">
            <div class="list-container-new download-pane-container">
                <DownloadUserView />
            </div>
        </div>
    </div>
</template>

<script setup>
import { useI18nStore } from '@/stores/i18n'
import DownloadUserView from '../DownloadUserView.vue'

const i18nStore = useI18nStore()
</script>
