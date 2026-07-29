<template>
    <div class="audio-view-container">
        <div class="glow-bg">
            <div class="glow glow-1"></div>
            <div class="glow glow-2"></div>
        </div>

        <div class="player-card">
            <!-- Metadata and Controls -->
            <div class="control-side">
                <div class="audio-header">
                    <h2 class="audio-title" :title="audioName">{{ audioName || 'Loading...' }}</h2>
                    <div class="audio-badge">AudioClip</div>
                </div>

                <div class="metadata-grid">
                    <div class="meta-item">
                        <div class="meta-label">File Size</div>
                        <div class="meta-value">{{ formattedSize }}</div>
                    </div>
                    <div class="meta-item">
                        <div class="meta-label">Duration</div>
                        <div class="meta-value">{{ formatTime(duration) }}</div>
                    </div>
                    <div class="meta-item full-width">
                        <div class="meta-label">System Path</div>
                        <div class="meta-value path-text" :title="audioPath">{{ audioPath || 'No Path' }}</div>
                    </div>
                </div>

                <!-- Progress Slider -->
                <div class="progress-section">
                    <div class="time-display">
                        <span>{{ formatTime(currentTime) }}</span>
                        <span>{{ formatTime(duration) }}</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        step="0.1"
                        :value="progress"
                        @input="onSliderInput"
                        :disabled="!duration"
                        class="player-slider native-slider"
                    />
                </div>

                <!-- Bottom Controls Bar -->
                <div class="controls-bar">
                    <!-- Left: loop & speed -->
                    <div class="controls-group">
                        <t-button
                            shape="circle"
                            variant="text"
                            :theme="isLoop ? 'primary' : 'default'"
                            @click="toggleLoop"
                            title="Loop"
                        >
                            <template #icon><t-icon-loop /></template>
                        </t-button>
                        <t-select
                            v-model="playbackRate"
                            size="small"
                            style="width: 76px"
                            @change="onSpeedChange"
                            :bordered="false"
                            class="speed-select"
                        >
                            <t-option :value="0.5" label="0.5x" />
                            <t-option :value="1.0" label="1.0x" />
                            <t-option :value="1.5" label="1.5x" />
                            <t-option :value="2.0" label="2.0x" />
                        </t-select>
                    </div>

                    <!-- Center: Play/Pause -->
                    <div class="controls-group main-btn-group">
                        <t-button
                            shape="circle"
                            size="large"
                            theme="primary"
                            @click="togglePlay"
                            :disabled="!audioSrc"
                            class="play-btn"
                        >
                            <template #icon>
                                <t-icon-pause v-if="isPlaying" size="20px" />
                                <t-icon-play v-else size="20px" />
                            </template>
                        </t-button>
                    </div>

                    <!-- Right: Volume controls -->
                    <div class="controls-group volume-group">
                        <t-button
                            shape="circle"
                            variant="text"
                            @click="toggleMute"
                            :title="isMuted ? 'Unmute' : 'Mute'"
                        >
                            <template #icon>
                                <t-icon-volume-mute v-if="isMuted || volume === 0" />
                                <t-icon-volume-up v-else />
                            </template>
                        </t-button>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            :value="volume"
                            @input="onVolumeInput"
                            class="volume-slider native-slider"
                            style="width: 70px"
                        />
                    </div>
                </div>
            </div>
        </div>

        <audio
            ref="audioElement"
            @timeupdate="onTimeUpdate"
            @loadedmetadata="onLoadedMetadata"
            @ended="onAudioEnded"
        ></audio>
    </div>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue'
import { UnityFSGui } from '@/assets/unityfs-gui'
import {
    PlayIcon as TIconPlay,
    PauseIcon as TIconPause,
    SoundUpIcon as TIconVolumeUp,
    SoundMuteIcon as TIconVolumeMute,
    RefreshIcon as TIconLoop,
} from 'tdesign-icons-vue-next'
import { MessagePlugin } from 'tdesign-vue-next'

const { assetManagerId, objectId, pathID } = defineProps(['assetManagerId', 'objectId', 'pathID'])

const audioSrc = ref(null)
const audioName = ref('')
const audioPath = ref('')
const audioSize = ref(0)
const audioType = ref('AudioClip')

const audioElement = ref(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const progress = ref(0)
const volume = ref(80) // 0-100
const isMuted = ref(false)
const playbackRate = ref(1.0)
const isLoop = ref(false)

// Format size dynamically
const formattedSize = computed(() => {
    if (!audioSize.value) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(audioSize.value) / Math.log(k))
    return parseFloat((audioSize.value / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
})

function formatTime(secs) {
    if (isNaN(secs) || secs === Infinity) return '00:00'
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

async function start() {
    try {
        const assetManager = await UnityFSGui.assetManagers.get(assetManagerId)
        // 优先用 pathID 精确定位，防止大文件中索引偏移导致预览错误的对象
        const object = pathID
            ? assetManager.getObjectInfoByPathId(BigInt(pathID))
            : assetManager.getObjectInfos()[objectId]

        audioName.value = object.name || 'Unnamed AudioClip'
        audioPath.value = object.path || ''
        audioSize.value = object.size || 0
        audioType.value = object.className || 'AudioClip'

        const fileInfo = await assetManager.exportFile(object, { type: 'dataURL' })
        audioSrc.value = fileInfo.data.raw

        if (audioElement.value) {
            audioElement.value.src = audioSrc.value
            audioElement.value.volume = volume.value / 100
            audioElement.value
                .play()
                .then(() => {
                    isPlaying.value = true
                })
                .catch((e) => {
                    console.log('Autoplay prevented:', e)
                })
        }
    } catch (err) {
        console.error('Audio load error:', err)
        MessagePlugin.error('加载音频失败: ' + err.message)
    }
}

function togglePlay() {
    if (!audioElement.value) return
    if (isPlaying.value) {
        audioElement.value.pause()
        isPlaying.value = false
    } else {
        audioElement.value
            .play()
            .then(() => {
                isPlaying.value = true
            })
            .catch(() => {
                MessagePlugin.error('播放失败')
            })
    }
}

function toggleMute() {
    if (!audioElement.value) return
    isMuted.value = !isMuted.value
    audioElement.value.muted = isMuted.value
}

function toggleLoop() {
    if (!audioElement.value) return
    isLoop.value = !isLoop.value
    audioElement.value.loop = isLoop.value
}

function onVolumeChange(val) {
    if (!audioElement.value) return
    audioElement.value.volume = val / 100
    if (val > 0 && isMuted.value) {
        isMuted.value = false
        audioElement.value.muted = false
    }
}

function onSliderInput(e) {
    const val = parseFloat(e.target.value)
    progress.value = val
    if (!audioElement.value || !duration.value) return
    const targetTime = (val / 100) * duration.value
    audioElement.value.currentTime = targetTime
}

function onVolumeInput(e) {
    const val = parseInt(e.target.value)
    volume.value = val
    onVolumeChange(val)
}

function onSpeedChange(val) {
    if (!audioElement.value) return
    audioElement.value.playbackRate = val
}

function onTimeUpdate() {
    if (!audioElement.value) return
    currentTime.value = audioElement.value.currentTime
    if (duration.value) {
        progress.value = (currentTime.value / duration.value) * 100
    }
}

function onLoadedMetadata() {
    if (!audioElement.value) return
    duration.value = audioElement.value.duration
}

function onAudioEnded() {
    isPlaying.value = false
    progress.value = 0
    currentTime.value = 0
}

onMounted(start)
</script>

<style scoped>
.audio-view-container {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f6f8fa;
    overflow: hidden;
    padding: 24px;
}

/* Atmospheric ambient background glow */
.glow-bg {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 0;
}

.glow {
    position: absolute;
    border-radius: 50%;
    filter: blur(100px);
    opacity: 0.12;
}

.glow-1 {
    width: 320px;
    height: 320px;
    background: #0052d9;
    top: -40px;
    left: -40px;
}

.glow-2 {
    width: 260px;
    height: 260px;
    background: #2ba471;
    bottom: -40px;
    right: -40px;
}

/* Glassmorphism Player Card */
.player-card {
    position: relative;
    z-index: 1;
    display: flex;
    width: 100%;
    max-width: 480px;
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.6);
    border-radius: 16px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
    overflow: hidden;
}

/* Control Side */
.control-side {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 24px;
    justify-content: space-between;
}

.audio-header {
    margin-bottom: 12px;
}

.audio-title {
    margin: 0 0 6px 0;
    font-size: 18px;
    font-weight: 600;
    color: #1b2c42;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 340px;
}

.audio-badge {
    display: inline-flex;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 500;
    color: #0052d9;
    background: rgba(0, 82, 217, 0.1);
    border-radius: 4px;
}

/* Metadata Grid */
.metadata-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-bottom: 16px;
    background: rgba(243, 246, 249, 0.3);
    padding: 12px;
    border-radius: 8px;
    border: 1px solid rgba(221, 226, 233, 0.3);
}

.meta-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.meta-item.full-width {
    grid-column: span 2;
}

.meta-label {
    font-size: 11px;
    color: #8896a8;
}

.meta-value {
    font-size: 13px;
    color: #2c3e50;
    font-weight: 500;
}

.path-text {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 11px;
    color: #475569;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    direction: rtl;
    text-align: left;
}

/* Progress Slider */
.progress-section {
    margin-bottom: 16px;
}

.time-display {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: #8896a8;
    margin-bottom: 4px;
    font-family: monospace;
}

/* Styles for player-slider will be defined below in native-slider section */

/* Controls Bar */
.controls-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.controls-group {
    display: flex;
    align-items: center;
    gap: 4px;
}

.main-btn-group {
    justify-content: center;
}

.play-btn {
    box-shadow: 0 4px 12px rgba(0, 82, 217, 0.25);
    transition: all 0.2s ease;
}

.play-btn:hover {
    transform: scale(1.05);
}

.volume-group {
    gap: 2px;
}

/* Native Slider Styling */
.native-slider {
    -webkit-appearance: none;
    appearance: none;
    height: 4px;
    background: rgba(221, 226, 233, 0.8);
    border-radius: 2px;
    outline: none;
    cursor: pointer;
    transition: background 0.15s ease;
    width: 100%;
}

.native-slider:hover {
    background: rgba(200, 207, 218, 1);
}

/* Thumb */
.native-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #0052d9;
    border: 2px solid #ffffff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
    transition:
        transform 0.1s ease,
        background-color 0.1s ease;
}

.native-slider::-webkit-slider-thumb:hover {
    transform: scale(1.2);
    background: #0040b0;
}

.native-slider::-webkit-slider-thumb:active {
    transform: scale(1.3);
}

/* Firefox Support */
.native-slider::-moz-range-thumb {
    width: 12px;
    height: 12px;
    border: 2px solid #ffffff;
    border-radius: 50%;
    background: #0052d9;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
    transition:
        transform 0.1s ease,
        background-color 0.1s ease;
    cursor: pointer;
}

.native-slider::-moz-range-thumb:hover {
    transform: scale(1.2);
    background: #0040b0;
}

.native-slider::-moz-range-track {
    width: 100%;
    height: 4px;
    background: rgba(221, 226, 233, 0.8);
    border-radius: 2px;
}

.speed-select :deep(.t-input) {
    font-size: 12px;
    color: #495770;
}
</style>
