<template>
    <div class="container">
        <!-- 顶部筛选与搜索栏 -->
        <div class="top-section">
            <div class="search-bar">
                <t-input placeholder="搜索资源名称、类型、路径..." v-model="userInput" clearable />
                <t-select
                    v-model="filterType"
                    multiple
                    placeholder="筛选资源类型"
                    :min-collapsed-num="1"
                    collapse-tags
                    :options="objectType"
                    clearable
                    class="type-filter-select"
                />
                <t-radio-group v-model="viewMode" variant="default-filled" size="medium" class="view-mode-toggle">
                    <t-radio-button value="flat">平铺</t-radio-button>
                    <t-radio-button value="tree">层级</t-radio-button>
                </t-radio-group>
            </div>
        </div>

        <!-- 视图切换显示区域 -->
        <div class="view-content-wrapper">
            <FlatObjectListView
                v-if="viewMode === 'flat'"
                :items="filteredObjects"
                :sort-mode="sortMode"
                :reverse-sort="reverseSort"
                @sort="handleSort"
            />
            <HierarchicalObjectListView
                v-slot="{ item }"
                v-else
                :items="filteredObjects"
                :sort-mode="sortMode"
                :reverse-sort="reverseSort"
                :user-input="userInput"
                @sort="handleSort"
            />
        </div>
        <LoadProgressCard :progress="loadPercentage"></LoadProgressCard>
    </div>
</template>

<script setup>
import { computed, ref, watch, markRaw } from 'vue'
import { useAssetStore } from '@/stores/useAssetStore'
import LoadProgressCard from '../LoadProgressCard.vue'
import FlatObjectListView from './FlatObjectListView.vue'
import HierarchicalObjectListView from './HierarchicalObjectListView.vue'

const assetStore = useAssetStore()

const userInput = ref('')
const sortMode = ref('id')
const reverseSort = ref(false)
const filterType = ref([])

// 视图展示模式：flat为扁平列表，tree为传统目录管理器形式
const viewMode = ref(localStorage.getItem('object-list-view-mode') || 'flat')
watch(viewMode, (newVal) => {
    localStorage.setItem('object-list-view-mode', newVal)
})

const objectType = computed(() => assetStore.objectTypes)
const loadPercentage = computed(() => assetStore.loadPercentage)

// 计算属性：处理筛选和排序
const filteredObjects = computed(() => {
    let result = assetStore.objectUI.list

    // 类型筛选
    if (filterType.value.length > 0) {
        const filterSet = new Set(filterType.value)
        result = result.filter((item) => filterSet.has(item.className))
    }

    // 搜索筛选
    if (userInput.value.trim()) {
        const searchTerm = userInput.value.trim().toLowerCase()
        result = result.filter(
            (item) =>
                item.name.toLowerCase().includes(searchTerm) ||
                item.className.toLowerCase().includes(searchTerm) ||
                (item.path && item.path.toLowerCase().includes(searchTerm)) ||
                item.exportExtension.toLowerCase().includes(searchTerm),
        )
    }

    // 排序
    result = sortObjects(result, sortMode.value, reverseSort.value)

    return result
})

// 监听筛选结果，存储结果供 ExportView 使用
watch(
    filteredObjects,
    (newVal) => {
        assetStore.objectUI.currentList = markRaw(newVal)
    },
    { immediate: true },
)

function handleSort(mode) {
    if (sortMode.value === mode) {
        reverseSort.value = !reverseSort.value
    } else {
        reverseSort.value = false
        sortMode.value = mode
    }
}

// 排序函数
function sortObjects(objects, mode, reverse) {
    const sorted = [...objects]

    sorted.sort((a, b) => {
        let aVal = a[mode]
        let bVal = b[mode]

        if (mode === 'size') {
            return (aVal || 0) - (bVal || 0)
        }

        // 处理可能为空的字符串
        aVal = aVal || ''
        bVal = bVal || ''

        return aVal.localeCompare(bVal)
    })

    return reverse ? sorted.reverse() : sorted
}
</script>

<style scoped>
.container {
    height: 100%;
    width: 100%;
    position: absolute;
    top: 0;
    left: 0;
    display: flex;
    flex-direction: column;
}

/* 顶部筛选与搜索栏 */
.top-section {
    position: absolute;
    top: 0;
    left: 0;
    height: 40px;
    width: 100%;
    display: flex;
    align-items: center;
    background: var(--td-bg-color-secondarycontainer);
    border-bottom: 1px solid var(--td-component-border);
    padding: 0 12px;
    box-sizing: border-box;
    z-index: 5;
}

.search-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
}

.type-filter-select {
    width: 250px;
}

.view-mode-toggle {
    margin-left: auto;
    flex-shrink: 0;
}

.view-content-wrapper {
    position: absolute;
    bottom: 0;
    left: 0;
    height: calc(100% - 40px);
    width: 100%;
    overflow: hidden;
}

@media (max-width: 768px) {
    .top-section {
        height: auto;
        padding: 8px 12px;
        position: relative;
    }
    .search-bar {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
    }
    .type-filter-select {
        width: 100% !important;
    }
    .view-mode-toggle {
        margin-left: 0;
        width: 100%;
    }
    .view-content-wrapper {
        position: relative;
        height: auto;
        flex: 1;
    }
}
</style>
