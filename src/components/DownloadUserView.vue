<template>
    <section class="download-container">
        <h3 class="section-title">正在下载 ({{ list.length }})</h3>
        <div v-if="list.length > 0" class="download-list">
            <div v-for="file in list" :key="file.id" class="download-item">
                <div class="progress-bar" :style="{ width: `${(file.progress?.progress || 0) * 100}%` }"></div>
                <div class="item-content">
                    <div class="file-info">
                        <span class="file-name">{{ file.name }}</span>
                    </div>
                    <div class="file-progress">{{ Math.round((file.progress?.progress || 0) * 10000) / 100 }}%</div>
                </div>
            </div>
        </div>
        <div v-else class="empty-state">没有正在下载的文件</div>

        <h3 class="section-title">下载完成 ({{ endList.length }})</h3>
        <div v-if="endList.length > 0" class="completed-list">
            <div v-for="file in endList" :key="file.id" class="completed-item" @click="handleFileClick(file)">
                <div class="file-info">
                    <span class="file-name">{{ file.name }}</span>
                </div>
                <div style="font-weight: bold">{{ getFileStateText(file) }}</div>
            </div>
        </div>
        <div v-else class="empty-state">没有已完成下载的文件</div>
    </section>
</template>

<script setup>
import { UnityFSGui } from '@/assets/unityfs-gui'
import { ref, computed, onMounted } from 'vue'

const rawList = ref({})
const rawEndList = ref({})

const list = computed(() => Object.values(rawList.value))
const endList = computed(() => Object.values(rawEndList.value))

const handleFileClick = (file) => {
    // 处理文件点击事件
    console.log('File clicked:', file)
}

const getFileStateText = (file) => {
    return GKD.downloadFile.FILE_STATES[file.state]
}

onMounted(() => {
    rawList.value = { ...UnityFSGui.downloadManager.list }
    rawEndList.value = { ...UnityFSGui.downloadManager.endList }

    const prevProgress = UnityFSGui.downloadManager.progress
    UnityFSGui.downloadManager.progress = function (e) {
        rawList.value = { ...this.list }
        rawEndList.value = { ...this.endList }
        if (prevProgress) {
            prevProgress.call(this, e)
        }
    }
})
</script>

<style scoped>
.download-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 16px;
    font-family: 'Segoe UI', system-ui, sans-serif;
}

.section-title {
    margin: 16px 0 8px;
    color: #333;
    font-size: 1.1rem;
}

.download-list,
.completed-list {
    margin-bottom: 24px;
}

.download-item {
    margin: 8px 0;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    height: 50px;
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
    background: white;
}

.download-item:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.progress-bar {
    position: absolute;
    height: 100%;
    left: 0;
    top: 0;
    background: rgba(66, 185, 131, 0.1);
    transition: width 0.3s ease;
}

.item-content {
    position: relative;
    padding: 0px 12px;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.file-info {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 0 12px 0 0;
}

.file-name {
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #333;
}

.file-progress {
    color: var(--primary-color);
    font-weight: bold;
    min-width: 80px;
    text-align: right;
}

.file-icon {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
}

.completed-item {
    padding: 12px;
    border-radius: 8px;
    margin: 4px 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    transition: background 0.2s;
}

.completed-item:hover {
    background: #f5f5f5;
}

.empty-state {
    color: #999;
    text-align: center;
    padding: 16px;
    font-size: 0.9rem;
}

:root {
    --primary-color: #42b983;
    --border-color: #e0e0e0;
}
</style>
