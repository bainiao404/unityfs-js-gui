<template>
    <div class="about-container">
        <div class="about-card">
            <!-- Animated Hero Header -->
            <div class="hero-section">
                <!-- Product Name -->
                <h1 class="brand-title">UnityFS JS GUI</h1>
                <p class="brand-subtitle">高性能纯 JavaScript Unity AssetBundle 解析与提取工具</p>
                <p class="brand-version-badge">Version 1.0.0 (Release)</p>
            </div>

            <!-- Stats/Badges Row -->
            <div class="stats-row">
                <div class="stat-badge">
                    <span class="stat-label">内核</span>
                    <span class="stat-value">Pure JS / WASM</span>
                </div>
                <div class="stat-badge">
                    <span class="stat-label">运行环境</span>
                    <span class="stat-value">{{ platformName }}</span>
                </div>
                <div class="stat-badge">
                    <span class="stat-label">开源协议</span>
                    <span class="stat-value">MIT</span>
                </div>
            </div>

            <!-- Description -->
            <div class="intro-box">
                <p class="intro-text">
                    UnityFS JS GUI 是一款基于 Web 和 Electron / Cordova 构建的高效 AssetBundle 提取套件。无需安装 Unity
                    即可在全平台（Web端、桌面客户端、移动端）实现 UnityFS
                    压缩包的智能解析、结构树检索、图片/音频/文本/MonoScript 逆向以及 3D 模型与 Spine 动画的直观预览。
                </p>
            </div>

            <!-- Grid Content Cards -->
            <div class="info-grid">
                <!-- Card 1: Features -->
                <div class="info-card">
                    <div class="card-header">
                        <t-icon name="view-list" class="card-icon" />
                        <h3 class="card-title">主要特性</h3>
                    </div>
                    <ul class="card-list">
                        <li><b>混合解码</b>：针对短小文件名深度优化了 JS 快速 UTF-8 解码</li>
                        <li><b>层级视图</b>：传统多级文件夹目录检索与平铺检索双结合</li>
                        <li><b>富媒体预览</b>：集成 3D 渲染、Spine 骨骼动画预览、音频播放</li>
                        <li><b>并发处理</b>：完全不依赖全局全局句柄的线程级安全设计</li>
                    </ul>
                </div>

                <!-- Card 2: Tech Stack -->
                <div class="info-card">
                    <div class="card-header">
                        <t-icon name="logo-chrome" class="card-icon" />
                        <h3 class="card-title">技术栈 / 依赖项</h3>
                    </div>
                    <div class="tag-cloud">
                        <t-tag variant="light" theme="primary">Vue 3</t-tag>
                        <t-tag variant="light" theme="success">Pinia</t-tag>
                        <t-tag variant="light" theme="warning">TDesign</t-tag>
                        <t-tag variant="light" theme="danger">Vite</t-tag>
                        <t-tag variant="light">Electron</t-tag>
                        <t-tag variant="light">Three.js</t-tag>
                        <t-tag variant="light">Monaco Editor</t-tag>
                        <t-tag variant="light">LZ4 / LZMA WASM</t-tag>
                    </div>
                </div>
            </div>

            <!-- Links & Community -->
            <div class="footer-links">
                <t-link
                    theme="primary"
                    href="https://github.com/bainiao404/unityfs-js-gui"
                    target="_blank"
                    class="github-link"
                >
                    <t-icon name="logo-github" /> GitHub 仓库 (bainiao404/unityfs-js-gui)
                </t-link>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { platform } from '@/utils/platform'

const platformName = computed(() => {
    if (platform.isElectron) return 'Electron Desktop'
    if (platform.isCordova) return 'Cordova App'
    return 'Web Browser'
})
</script>

<style scoped>
.about-container {
    padding: 24px;
    max-width: 800px;
    margin: 0 auto;
    overflow-y: auto;
    height: 100%;
    box-sizing: border-box;
}

.about-card {
    background: var(--td-bg-color-container);
    border-radius: 12px;
    border: 1px solid var(--td-component-border);
    padding: 40px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
    display: flex;
    flex-direction: column;
    gap: 32px;
}

/* Hero section */
.hero-section {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
}

.brand-title {
    margin: 0;
    font-size: 28px;
    font-weight: 700;
    letter-spacing: 0.5px;
    background: linear-gradient(135deg, var(--td-brand-color) 0%, #e066ff 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.brand-subtitle {
    margin: 0;
    font-size: 14px;
    color: var(--td-text-color-secondary);
}

.brand-version-badge {
    margin: 0;
    font-size: 12px;
    color: var(--td-text-color-placeholder);
    background: var(--td-bg-color-component);
    padding: 2px 10px;
    border-radius: 20px;
    width: fit-content;
}

/* Stats Row */
.stats-row {
    display: flex;
    justify-content: center;
    gap: 24px;
    flex-wrap: wrap;
}

.stat-badge {
    background: var(--td-bg-color-secondarycontainer);
    border: 1px solid var(--td-component-border);
    padding: 10px 20px;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 120px;
    transition: all 0.2s ease;
}

.stat-badge:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    border-color: var(--td-brand-color-focus);
}

.stat-label {
    font-size: 11px;
    color: var(--td-text-color-placeholder);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.stat-value {
    font-size: 13px;
    font-weight: 600;
    color: var(--td-text-color-primary);
    margin-top: 4px;
}

/* Intro block */
.intro-box {
    border-left: 3px solid var(--td-brand-color);
    padding-left: 16px;
}

.intro-text {
    margin: 0;
    font-size: 14px;
    line-height: 1.6;
    color: var(--td-text-color-secondary);
}

/* Grid content */
.info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
}

@media (max-width: 600px) {
    .info-grid {
        grid-template-columns: 1fr;
    }
}

.info-card {
    background: var(--td-bg-color-secondarycontainer);
    border: 1px solid var(--td-component-border);
    border-radius: 8px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.card-header {
    display: flex;
    align-items: center;
    gap: 8px;
}

.card-icon {
    font-size: 18px;
    color: var(--td-brand-color);
}

.card-title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--td-text-color-primary);
}

.card-list {
    margin: 0;
    padding-left: 18px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 12px;
    line-height: 1.5;
    color: var(--td-text-color-secondary);
}

.tag-cloud {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

/* Footer link */
.footer-links {
    display: flex;
    justify-content: center;
    margin-top: 12px;
}

.github-link {
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: color 0.2s ease;
}
</style>
