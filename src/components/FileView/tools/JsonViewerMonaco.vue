<template>
    <div ref="editorContainer" class="monaco-json-viewer-container"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as monaco from 'monaco-editor'

// Standard worker environment configuration for Vite
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'

self.MonacoEnvironment = {
    getWorker(_, label) {
        if (label === 'json') {
            return new jsonWorker()
        }
        return new editorWorker()
    },
}

const props = defineProps({
    data: {
        type: [Object, Array, String],
        required: true,
    },
    language: {
        type: String,
        default: 'json',
    },
})

const editorContainer = ref(null)
let editorInstance = null

function getJsonString(val) {
    if (typeof val === 'string') return val
    try {
        return JSON.stringify(val, null, 2)
    } catch (e) {
        console.error('Failed to stringify JSON data', e)
        return JSON.stringify(
            {
                error: 'JSON 数据体积超限 (Invalid string length)，浏览器无法将其完整序列化为字符串进行展示。',
                message:
                    "为了保证您的浏览器运行稳定，请直接点击右上角的 '下载 JSON' 按钮保存完整数据并使用本地专业工具查看。",
                details: e.message,
            },
            null,
            2,
        )
    }
}

let resizeObserver = null

onMounted(() => {
    if (!editorContainer.value) return

    editorInstance = monaco.editor.create(editorContainer.value, {
        value: getJsonString(props.data),
        language: props.language,
        theme: 'vs-dark', // Use dark theme
        readOnly: true,
        automaticLayout: true,
        minimap: {
            enabled: true,
        },
        scrollBeyondLastLine: false,
        folding: true,
        fontSize: 13,
        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
        lineNumbers: 'on',
        renderLineHighlight: 'all',
        tabSize: 2,
    })

    if (window.ResizeObserver) {
        resizeObserver = new ResizeObserver(() => {
            editorInstance?.layout()
        })
        resizeObserver.observe(editorContainer.value)
    }
})

onBeforeUnmount(() => {
    if (resizeObserver) {
        resizeObserver.disconnect()
        resizeObserver = null
    }
    if (editorInstance) {
        editorInstance.dispose()
        editorInstance = null
    }
})

watch(
    () => props.data,
    (newData) => {
        if (editorInstance) {
            editorInstance.setValue(getJsonString(newData))
        }
    },
)

watch(
    () => props.language,
    (newLang) => {
        if (editorInstance) {
            const model = editorInstance.getModel()
            if (model) {
                monaco.editor.setModelLanguage(model, newLang)
            }
        }
    },
)
</script>

<style scoped>
.monaco-json-viewer-container {
    position: absolute;
    top: 16px;
    left: 16px;
    right: 16px;
    bottom: 16px;
    border: 1px solid var(--td-component-border);
}
</style>
