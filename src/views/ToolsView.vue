<template>
    <div class="tools-viewport-container">
        <div class="split-container">
            <!-- Left Pane: Tools Navigation/Switcher -->
            <div class="sidebar-pane">
                <div class="sidebar-header">
                    <h2 class="sidebar-title">工具箱</h2>
                </div>

                <div class="sidebar-menu">
                    <!-- Tool Item 1: Addressables Catalog Parser -->
                    <div
                        class="menu-item"
                        :class="{ active: activeTool === 'addressables' }"
                        @click="activeTool = 'addressables'"
                    >
                        <file-icon class="menu-icon" />
                        <span class="menu-label">Addressables 解析</span>
                    </div>

                    <!-- Tool Item 2: Base64 Converter -->
                    <div class="menu-item" :class="{ active: activeTool === 'base64' }" @click="activeTool = 'base64'">
                        <file-add-icon class="menu-icon" />
                        <span class="menu-label">Base64 转换</span>
                    </div>

                    <!-- Tool Item 3: AES Crypto -->
                    <div class="menu-item" :class="{ active: activeTool === 'aes' }" @click="activeTool = 'aes'">
                        <lock-on-icon class="menu-icon" />
                        <span class="menu-label">AES 与哈希工具</span>
                    </div>
                </div>
            </div>

            <!-- Right Pane: Sub-Tool Content Area -->
            <div class="content-pane">
                <addressables-parser v-if="activeTool === 'addressables'" />
                <base64-tool v-else-if="activeTool === 'base64'" />
                <aes-tool v-else-if="activeTool === 'aes'" />
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { FileIcon, FileAddIcon, LockOnIcon } from 'tdesign-icons-vue-next'
import AddressablesParser from '../tools/AddressablesParser.vue'
import Base64Tool from '../tools/Base64Tool.vue'
import AesTool from '../tools/AesTool.vue'

// Active Tool Selection
const activeTool = ref('addressables')
</script>

<style scoped>
.tools-viewport-container {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background-color: var(--td-bg-color-page);
}

.split-container {
    display: flex;
    height: 100%;
    width: 100%;
    overflow: hidden;
}

/* Sidebar Styling */
.sidebar-pane {
    width: 220px;
    background-color: var(--td-bg-color-container);
    border-right: 1px solid var(--td-component-border);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    padding: 16px 0;
    box-sizing: border-box;
}

.sidebar-header {
    padding: 0 16px 16px;
    border-bottom: 1px solid var(--td-component-border);
    margin-bottom: 12px;
}

.sidebar-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--td-text-color-primary);
}

.sidebar-menu {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 0 12px;
    overflow-y: auto;
}

.menu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    color: var(--td-text-color-secondary);
    user-select: none;
}

.menu-item:hover {
    background-color: var(--td-bg-color-container-hover);
    color: var(--td-text-color-primary);
}

.menu-item.active {
    background-color: var(--td-bg-color-component-active);
    color: var(--td-brand-color);
    font-weight: 600;
}

.menu-icon {
    font-size: 16px;
}

.menu-label {
    font-size: 13px;
    flex: 1;
}

/* Content Pane Styling */
.content-pane {
    flex: 1;
    display: flex;
    flex-direction: column;
    background-color: var(--td-bg-color-page);
    overflow: hidden;
}
</style>
