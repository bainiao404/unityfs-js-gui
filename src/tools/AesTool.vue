<template>
    <div class="tool-content-layout">
        <div class="tool-header-bar">
            <h3 class="tool-title">AES 加密与哈希工具</h3>
        </div>

        <div class="tool-body-tabs">
            <t-tabs v-model="activeTab" class="w-100 h-100">
                <!-- Tab 1: AES Text Crypto -->
                <t-tab-panel value="aes_text" label="文本 AES">
                    <div class="tab-scroll-container">
                        <div class="aes-tool-layout">
                            <!-- Top Input Pane -->
                            <div class="io-panel">
                                <div class="panel-header">
                                    <span class="panel-title">输入数据</span>
                                    <t-button size="small" variant="text" theme="default" @click="inputText = ''"
                                        >清空</t-button
                                    >
                                </div>
                                <t-textarea
                                    v-model="inputText"
                                    placeholder="请输入待加密的明文，或待解密的密文..."
                                    :rows="4"
                                    class="io-textarea monospace-font"
                                />
                            </div>

                            <!-- Configuration Options Pane -->
                            <div class="config-pane">
                                <div class="config-grid">
                                    <div class="config-item">
                                        <span class="config-label">密钥 (Key)</span>
                                        <t-input v-model="keyText" placeholder="密钥字符串" class="monospace-font">
                                            <template #suffix>
                                                <t-button
                                                    size="small"
                                                    variant="text"
                                                    theme="primary"
                                                    @click="generateRandomKey"
                                                    >随机</t-button
                                                >
                                            </template>
                                        </t-input>
                                    </div>
                                    <div class="config-item" v-if="aesMode !== 'ECB'">
                                        <span class="config-label">偏移量 (IV)</span>
                                        <t-input
                                            v-model="ivText"
                                            placeholder="偏移量字符串，通常16字节"
                                            class="monospace-font"
                                        />
                                    </div>
                                    <div class="config-item">
                                        <span class="config-label">加密模式</span>
                                        <t-select v-model="aesMode" :options="modeOptions" />
                                    </div>
                                    <div class="config-item">
                                        <span class="config-label">填充方式</span>
                                        <t-select v-model="aesPadding" :options="paddingOptions" />
                                    </div>
                                    <div class="config-item">
                                        <span class="config-label">输出格式</span>
                                        <t-select v-model="outputFormat" :options="formatOptions" />
                                    </div>
                                </div>
                            </div>

                            <!-- Action Buttons -->
                            <div class="actions-row">
                                <t-button theme="primary" @click="encryptAES" class="mr-8">AES 加密</t-button>
                                <t-button theme="warning" @click="decryptAES">AES 解密</t-button>
                            </div>

                            <!-- Bottom Output Pane -->
                            <div class="io-panel mt-16">
                                <div class="panel-header">
                                    <span class="panel-title">结果输出</span>
                                    <t-button
                                        size="small"
                                        variant="text"
                                        theme="primary"
                                        @click="copyToClipboard(outputText)"
                                        >复制结果</t-button
                                    >
                                </div>
                                <t-textarea
                                    v-model="outputText"
                                    placeholder="加密或解密的结果将在此显示..."
                                    :rows="4"
                                    readonly
                                    class="io-textarea monospace-font"
                                />
                            </div>
                        </div>
                    </div>
                </t-tab-panel>

                <!-- Tab 2: AES File Crypto -->
                <t-tab-panel value="aes_file" label="文件 AES">
                    <div class="tab-scroll-container">
                        <div class="aes-tool-layout">
                            <!-- Configuration Options Pane -->
                            <div class="config-pane">
                                <div class="config-grid">
                                    <div class="config-item">
                                        <span class="config-label">密钥 (Key)</span>
                                        <t-input v-model="keyText" placeholder="密钥字符串" class="monospace-font">
                                            <template #suffix>
                                                <t-button
                                                    size="small"
                                                    variant="text"
                                                    theme="primary"
                                                    @click="generateRandomKey"
                                                    >随机</t-button
                                                >
                                            </template>
                                        </t-input>
                                    </div>
                                    <div class="config-item" v-if="aesMode !== 'ECB'">
                                        <span class="config-label">偏移量 (IV)</span>
                                        <t-input
                                            v-model="ivText"
                                            placeholder="偏移量字符串，通常16字节"
                                            class="monospace-font"
                                        />
                                    </div>
                                    <div class="config-item">
                                        <span class="config-label">加密模式</span>
                                        <t-select v-model="aesMode" :options="modeOptions" />
                                    </div>
                                    <div class="config-item">
                                        <span class="config-label">填充方式</span>
                                        <t-select v-model="aesPadding" :options="paddingOptions" />
                                    </div>
                                </div>
                            </div>

                            <!-- File Panels Split Grid -->
                            <div class="file-split-grid mt-12">
                                <!-- Left: File Encrypt -->
                                <div class="file-card-box">
                                    <h4 class="card-box-title">文件加密</h4>
                                    <div
                                        class="file-drop-zone-small"
                                        :class="{ 'is-dragover': isEncDragOver }"
                                        @dragover.prevent="isEncDragOver = true"
                                        @dragleave="isEncDragOver = false"
                                        @drop.prevent="onEncFileDrop"
                                        @click="triggerEncFileSelect"
                                    >
                                        <input
                                            type="file"
                                            ref="encFileInputRef"
                                            style="display: none"
                                            @change="onEncFileSelected"
                                        />
                                        <file-add-icon class="drop-icon" />
                                        <div class="drop-text">选择或拖入要加密的文件</div>
                                    </div>

                                    <div v-if="encFileName" class="file-info-row mt-8">
                                        <span class="file-info-name text-ellipsis" :title="encFileName">{{
                                            encFileName
                                        }}</span>
                                        <span class="file-info-size monospace-font">({{ encFileSize }})</span>
                                    </div>

                                    <div class="mt-12">
                                        <t-button
                                            block
                                            theme="primary"
                                            :disabled="!encFileBuffer"
                                            :loading="fileEncLoading"
                                            @click="encryptFile"
                                        >
                                            加密文件并下载
                                        </t-button>
                                    </div>
                                </div>

                                <!-- Right: File Decrypt -->
                                <div class="file-card-box">
                                    <h4 class="card-box-title">文件解密</h4>
                                    <div
                                        class="file-drop-zone-small"
                                        :class="{ 'is-dragover': isDecDragOver }"
                                        @dragover.prevent="isDecDragOver = true"
                                        @dragleave="isDecDragOver = false"
                                        @drop.prevent="onDecFileDrop"
                                        @click="triggerDecFileSelect"
                                    >
                                        <input
                                            type="file"
                                            ref="decFileInputRef"
                                            style="display: none"
                                            @change="onDecFileSelected"
                                        />
                                        <file-add-icon class="drop-icon" />
                                        <div class="drop-text">选择或拖入要解密的文件</div>
                                    </div>

                                    <div v-if="decFileName" class="file-info-row mt-8">
                                        <span class="file-info-name text-ellipsis" :title="decFileName">{{
                                            decFileName
                                        }}</span>
                                        <span class="file-info-size monospace-font">({{ decFileSize }})</span>
                                    </div>

                                    <div class="input-row mt-12">
                                        <t-input
                                            v-model="decryptedOutputFileName"
                                            placeholder="解密后保存文件名，例如: decoded.png"
                                        />
                                    </div>

                                    <div class="mt-12">
                                        <t-button
                                            block
                                            theme="warning"
                                            :disabled="!decFileBuffer"
                                            :loading="fileDecLoading"
                                            @click="decryptFile"
                                        >
                                            解密文件并下载
                                        </t-button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </t-tab-panel>

                <!-- Tab 3: Hash Calculation -->
                <t-tab-panel value="hash" label="哈希计算">
                    <div class="tab-scroll-container">
                        <div class="hash-tool-container">
                            <div class="io-panel">
                                <div class="panel-header">
                                    <span class="panel-title">输入文本</span>
                                    <t-button size="small" variant="text" theme="default" @click="clearHash"
                                        >清空</t-button
                                    >
                                </div>
                                <t-textarea
                                    v-model="hashInputText"
                                    placeholder="请输入计算哈希的文本内容..."
                                    :rows="4"
                                    class="io-textarea monospace-font"
                                    @input="calculateHashes"
                                />
                            </div>

                            <div class="section-card mt-16">
                                <h4 class="section-title">计算结果</h4>
                                <div class="hash-results-table">
                                    <div class="hash-row">
                                        <div class="hash-label">MD5</div>
                                        <div class="hash-value monospace-font select-all">
                                            {{ hashResults.md5 || '-' }}
                                        </div>
                                        <t-button
                                            size="small"
                                            variant="text"
                                            theme="primary"
                                            @click="copyToClipboard(hashResults.md5)"
                                            >复制</t-button
                                        >
                                    </div>
                                    <div class="hash-row">
                                        <div class="hash-label">SHA-1</div>
                                        <div class="hash-value monospace-font select-all">
                                            {{ hashResults.sha1 || '-' }}
                                        </div>
                                        <t-button
                                            size="small"
                                            variant="text"
                                            theme="primary"
                                            @click="copyToClipboard(hashResults.sha1)"
                                            >复制</t-button
                                        >
                                    </div>
                                    <div class="hash-row">
                                        <div class="hash-label">SHA-256</div>
                                        <div class="hash-value monospace-font select-all">
                                            {{ hashResults.sha256 || '-' }}
                                        </div>
                                        <t-button
                                            size="small"
                                            variant="text"
                                            theme="primary"
                                            @click="copyToClipboard(hashResults.sha256)"
                                            >复制</t-button
                                        >
                                    </div>
                                    <div class="hash-row">
                                        <div class="hash-label">SHA-512</div>
                                        <div class="hash-value monospace-font select-all">
                                            {{ hashResults.sha512 || '-' }}
                                        </div>
                                        <t-button
                                            size="small"
                                            variant="text"
                                            theme="primary"
                                            @click="copyToClipboard(hashResults.sha512)"
                                            >复制</t-button
                                        >
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </t-tab-panel>
            </t-tabs>
        </div>
    </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import { FileAddIcon } from 'tdesign-icons-vue-next'
import CryptoJS from 'crypto-js'

const activeTab = ref('aes_text')

// AES parameters
const inputText = ref('')
const outputText = ref('')
const keyText = ref('bainiao_secret_key')
const ivText = ref('bainiao_init_vector')
const aesMode = ref('CBC')
const aesPadding = ref('PKCS7')
const outputFormat = ref('Base64')

// AES Options
const modeOptions = [
    { label: 'CBC', value: 'CBC' },
    { label: 'ECB', value: 'ECB' },
    { label: 'CFB', value: 'CFB' },
    { label: 'OFB', value: 'OFB' },
    { label: 'CTR', value: 'CTR' },
]

const paddingOptions = [
    { label: 'PKCS7', value: 'PKCS7' },
    { label: 'ZeroPadding', value: 'ZeroPadding' },
    { label: 'NoPadding', value: 'NoPadding' },
]

const formatOptions = [
    { label: 'Base64', value: 'Base64' },
    { label: 'Hex (十六进制)', value: 'Hex' },
]

// Hash parameters
const hashInputText = ref('')
const hashResults = ref({
    md5: '',
    sha1: '',
    sha256: '',
    sha512: '',
})

// AES File variables
const encFileInputRef = ref(null)
const decFileInputRef = ref(null)
const isEncDragOver = ref(false)
const isDecDragOver = ref(false)

const encFileName = ref('')
const encFileSize = ref('')
const encFileBuffer = ref(null)
const fileEncLoading = ref(false)

const decFileName = ref('')
const decFileSize = ref('')
const decFileBuffer = ref(null)
const fileDecLoading = ref(false)
const decryptedOutputFileName = ref('')

// Helpers for size formatting
function formatBytes(bytes) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Generate a random key
function generateRandomKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < 16; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    keyText.value = result
    MessagePlugin.success('已随机生成 16 位密钥')
}

// AES Helpers for mode & padding mapping
function getCryptoJSMode(modeName) {
    switch (modeName) {
        case 'ECB':
            return CryptoJS.mode.ECB
        case 'CFB':
            return CryptoJS.mode.CFB
        case 'OFB':
            return CryptoJS.mode.OFB
        case 'CTR':
            return CryptoJS.mode.CTR
        default:
            return CryptoJS.mode.CBC
    }
}

function getCryptoJSPadding(paddingName) {
    switch (paddingName) {
        case 'ZeroPadding':
            return CryptoJS.pad.ZeroPadding
        case 'NoPadding':
            return CryptoJS.pad.NoPadding
        default:
            return CryptoJS.pad.Pkcs7
    }
}

// AES Text Encryption
function encryptAES() {
    if (!inputText.value) {
        MessagePlugin.warning('请输入待加密数据')
        return
    }
    if (!keyText.value) {
        MessagePlugin.warning('请输入密钥')
        return
    }
    try {
        const key = CryptoJS.enc.Utf8.parse(keyText.value)
        const iv = aesMode.value !== 'ECB' ? CryptoJS.enc.Utf8.parse(ivText.value) : undefined

        const options = {
            mode: getCryptoJSMode(aesMode.value),
            padding: getCryptoJSPadding(aesPadding.value),
        }
        if (iv) options.iv = iv

        const encrypted = CryptoJS.AES.encrypt(inputText.value, key, options)

        if (outputFormat.value === 'Hex') {
            outputText.value = encrypted.ciphertext.toString(CryptoJS.enc.Hex)
        } else {
            outputText.value = encrypted.toString()
        }
        MessagePlugin.success('加密成功')
    } catch (e) {
        MessagePlugin.error('加密失败: ' + e.message)
    }
}

// AES Text Decryption
function decryptAES() {
    if (!inputText.value) {
        MessagePlugin.warning('请输入密文数据')
        return
    }
    if (!keyText.value) {
        MessagePlugin.warning('请输入密钥')
        return
    }
    try {
        const key = CryptoJS.enc.Utf8.parse(keyText.value)
        const iv = aesMode.value !== 'ECB' ? CryptoJS.enc.Utf8.parse(ivText.value) : undefined

        const options = {
            mode: getCryptoJSMode(aesMode.value),
            padding: getCryptoJSPadding(aesPadding.value),
        }
        if (iv) options.iv = iv

        let decrypted
        if (outputFormat.value === 'Hex') {
            // Hex parsing
            const encryptedHex = CryptoJS.enc.Hex.parse(inputText.value)
            const cipherParams = CryptoJS.lib.CipherParams.create({
                ciphertext: encryptedHex,
            })
            decrypted = CryptoJS.AES.decrypt(cipherParams, key, options)
        } else {
            // Base64 parsing
            decrypted = CryptoJS.AES.decrypt(inputText.value, key, options)
        }

        const utf8Text = decrypted.toString(CryptoJS.enc.Utf8)
        if (!utf8Text) {
            throw new Error('解密结果为空，请检查密文、密钥或加密配置')
        }
        outputText.value = utf8Text
        MessagePlugin.success('解密成功')
    } catch (e) {
        MessagePlugin.error('解密失败，请检查密钥或参数配置')
    }
}

// Hashing calculations
function calculateHashes() {
    const text = hashInputText.value
    if (!text) {
        hashResults.value = { md5: '', sha1: '', sha256: '', sha512: '' }
        return
    }
    try {
        hashResults.value = {
            md5: CryptoJS.MD5(text).toString(),
            sha1: CryptoJS.SHA1(text).toString(),
            sha256: CryptoJS.SHA256(text).toString(),
            sha512: CryptoJS.SHA512(text).toString(),
        }
    } catch (e) {
        console.error('Hash calculation error:', e)
    }
}

function clearHash() {
    hashInputText.value = ''
    hashResults.value = {
        md5: '',
        sha1: '',
        sha256: '',
        sha512: '',
    }
}

// Clipboard copy helper
function copyToClipboard(text) {
    if (!text) {
        MessagePlugin.warning('内容为空')
        return
    }
    navigator.clipboard
        .writeText(text)
        .then(() => {
            MessagePlugin.success('已复制到剪贴板')
        })
        .catch((err) => {
            MessagePlugin.error('复制失败')
        })
}

// AES File Select & Processing
function triggerEncFileSelect() {
    encFileInputRef.value?.click()
}

function triggerDecFileSelect() {
    decFileInputRef.value?.click()
}

function processEncFile(file) {
    if (!file) return
    encFileName.value = file.name
    encFileSize.value = formatBytes(file.size)
    const reader = new FileReader()
    reader.onload = (e) => {
        encFileBuffer.value = e.target.result
        MessagePlugin.success('待加密文件导入成功')
    }
    reader.readAsArrayBuffer(file)
}

function processDecFile(file) {
    if (!file) return
    decFileName.value = file.name
    decFileSize.value = formatBytes(file.size)

    // Suggest output filename
    let name = file.name
    if (name.toLowerCase().endsWith('.enc')) {
        decryptedOutputFileName.value = name.substring(0, name.length - 4)
    } else {
        decryptedOutputFileName.value = 'decrypted_' + name
    }

    const reader = new FileReader()
    reader.onload = (e) => {
        decFileBuffer.value = e.target.result
        MessagePlugin.success('待解密文件导入成功')
    }
    reader.readAsArrayBuffer(file)
}

function onEncFileSelected(e) {
    if (e.target.files && e.target.files.length > 0) {
        processEncFile(e.target.files[0])
    }
}

function onEncFileDrop(e) {
    isEncDragOver.value = false
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        processEncFile(e.dataTransfer.files[0])
    }
}

function onDecFileSelected(e) {
    if (e.target.files && e.target.files.length > 0) {
        processDecFile(e.target.files[0])
    }
}

function onDecFileDrop(e) {
    isDecDragOver.value = false
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        processDecFile(e.dataTransfer.files[0])
    }
}

// ArrayBuffer <-> WordArray Conversions
function arrayBufferToWordArray(ab) {
    const i8a = new Uint8Array(ab)
    const len = i8a.length
    const words = []
    for (let i = 0; i < len; i += 4) {
        words.push((i8a[i] << 24) | (i8a[i + 1] << 16) | (i8a[i + 2] << 8) | i8a[i + 3])
    }
    return CryptoJS.lib.WordArray.create(words, len)
}

function wordArrayToArrayBuffer(wordArray) {
    const words = wordArray.words
    const sigBytes = wordArray.sigBytes
    const u8 = new Uint8Array(sigBytes)
    for (let i = 0; i < sigBytes; i++) {
        const byte = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff
        u8[i] = byte
    }
    return u8.buffer
}

// AES File Encryption
function encryptFile() {
    if (!encFileBuffer.value) {
        MessagePlugin.warning('请先导入要加密的文件')
        return
    }
    if (!keyText.value) {
        MessagePlugin.warning('请输入加密密钥')
        return
    }

    fileEncLoading.value = true
    setTimeout(() => {
        try {
            const key = CryptoJS.enc.Utf8.parse(keyText.value)
            const iv = aesMode.value !== 'ECB' ? CryptoJS.enc.Utf8.parse(ivText.value) : undefined

            const options = {
                mode: getCryptoJSMode(aesMode.value),
                padding: getCryptoJSPadding(aesPadding.value),
            }
            if (iv) options.iv = iv

            const words = arrayBufferToWordArray(encFileBuffer.value)
            const encrypted = CryptoJS.AES.encrypt(words, key, options)

            const cipherBuffer = wordArrayToArrayBuffer(encrypted.ciphertext)

            const blob = new Blob([cipherBuffer], { type: 'application/octet-stream' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = encFileName.value + '.enc'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)

            MessagePlugin.success('文件加密成功，已下载')
        } catch (e) {
            MessagePlugin.error('文件加密失败: ' + e.message)
        } finally {
            fileEncLoading.value = false
        }
    }, 100)
}

// AES File Decryption
function decryptFile() {
    if (!decFileBuffer.value) {
        MessagePlugin.warning('请先导入要解密的文件')
        return
    }
    if (!keyText.value) {
        MessagePlugin.warning('请输入解密密钥')
        return
    }

    fileDecLoading.value = true
    setTimeout(() => {
        try {
            const key = CryptoJS.enc.Utf8.parse(keyText.value)
            const iv = aesMode.value !== 'ECB' ? CryptoJS.enc.Utf8.parse(ivText.value) : undefined

            const options = {
                mode: getCryptoJSMode(aesMode.value),
                padding: getCryptoJSPadding(aesPadding.value),
            }
            if (iv) options.iv = iv

            const cipherWords = arrayBufferToWordArray(decFileBuffer.value)
            const cipherParams = CryptoJS.lib.CipherParams.create({
                ciphertext: cipherWords,
            })

            const decrypted = CryptoJS.AES.decrypt(cipherParams, key, options)
            const decryptedBuffer = wordArrayToArrayBuffer(decrypted)

            if (decryptedBuffer.byteLength === 0) {
                throw new Error('解密字节长度为 0，这可能表示密钥、偏移量或配置不匹配。')
            }

            const blob = new Blob([decryptedBuffer], { type: 'application/octet-stream' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = decryptedOutputFileName.value || 'decrypted_file'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)

            MessagePlugin.success('文件解密成功，已下载')
        } catch (e) {
            console.error(e)
            MessagePlugin.error('文件解密失败，请检查解密参数')
        } finally {
            fileDecLoading.value = false
        }
    }, 100)
}

// Trigger initial hash calculation on changes
watch(hashInputText, calculateHashes)
</script>

<style scoped>
.tool-content-layout {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    overflow: hidden;
}

.tool-header-bar {
    padding: 16px 20px;
    background-color: var(--td-bg-color-container);
    border-bottom: 1px solid var(--td-component-border);
    flex-shrink: 0;
}

.tool-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--td-text-color-primary);
}

.tool-body-tabs {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
}

.tool-body-tabs :deep(.t-tabs) {
    display: flex;
    flex-direction: column;
}

.tool-body-tabs :deep(.t-tabs__content) {
    flex: 1;
    position: relative;
    overflow: hidden;
}

.tool-body-tabs :deep(.t-tab-panel) {
    position: absolute;
    inset: 0;
    height: 100%;
    width: 100%;
}

.tab-scroll-container {
    height: 100%;
    overflow-y: auto;
    padding: 20px;
    box-sizing: border-box;
}

/* AES view specific styling */
.aes-tool-layout {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.io-panel {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.panel-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--td-text-color-secondary);
}

.io-textarea :deep(textarea) {
    font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
    font-size: 13px;
    line-height: 1.5;
}

.config-pane {
    background-color: var(--td-bg-color-container);
    border: 1px solid var(--td-component-border);
    border-radius: 8px;
    padding: 16px;
}

.config-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
}

.config-item {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.config-label {
    font-size: 12px;
    color: var(--td-text-color-secondary);
    font-weight: 500;
}

.actions-row {
    display: flex;
    margin-top: 4px;
}

.mr-8 {
    margin-right: 8px;
}

/* File split grid */
.file-split-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
}

.file-card-box {
    background-color: var(--td-bg-color-container);
    border: 1px solid var(--td-component-border);
    border-radius: 8px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
}

.card-box-title {
    margin: 0 0 16px 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--td-text-color-primary);
    border-bottom: 1px solid var(--td-component-border);
    padding-bottom: 8px;
}

.file-drop-zone-small {
    border: 2px dashed var(--td-component-border);
    border-radius: 8px;
    padding: 32px 16px;
    text-align: center;
    cursor: pointer;
    background-color: var(--td-bg-color-page);
    transition: all 0.2s ease;
}

.file-drop-zone-small:hover,
.file-drop-zone-small.is-dragover {
    border-color: var(--td-brand-color);
    background-color: var(--td-bg-color-container-hover);
}

.drop-icon {
    font-size: 32px;
    color: var(--td-brand-color);
    margin-bottom: 8px;
}

.drop-text {
    font-size: 13px;
    color: var(--td-text-color-primary);
}

.file-info-row {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
}

.file-info-name {
    color: var(--td-text-color-primary);
    font-weight: 600;
    max-width: 200px;
}

.file-info-size {
    color: var(--td-text-color-placeholder);
}

.input-row {
    width: 100%;
}

/* Hash table view */
.section-card {
    background-color: var(--td-bg-color-container);
    border: 1px solid var(--td-component-border);
    border-radius: 8px;
    padding: 16px;
}

.section-title {
    margin: 0 0 16px 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--td-text-color-primary);
}

.hash-results-table {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.hash-row {
    display: flex;
    align-items: center;
    border-bottom: 1px solid var(--td-component-border);
    padding-bottom: 10px;
}

.hash-row:last-child {
    border-bottom: none;
    padding-bottom: 0;
}

.hash-label {
    width: 80px;
    font-weight: 600;
    font-size: 13px;
    color: var(--td-text-color-primary);
}

.hash-value {
    flex: 1;
    font-size: 12px;
    color: var(--td-text-color-secondary);
    word-break: break-all;
    background-color: var(--td-bg-color-page);
    padding: 6px 12px;
    border-radius: 4px;
    margin-right: 12px;
    border: 1px solid var(--td-component-border);
}

.select-all {
    user-select: all;
}

.mt-8 {
    margin-top: 8px;
}

.mt-12 {
    margin-top: 12px;
}

.mt-16 {
    margin-top: 16px;
}

.w-100 {
    width: 100%;
}

.h-100 {
    height: 100%;
}

.monospace-font {
    font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
}

.text-ellipsis {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
</style>
