<template>
    <div class="control-panel" :class="{ 'is-collapsed': isPanelCollapsed }">
        <!-- Collapsible toggle handle -->
        <div class="panel-toggle-btn" @click="emit('update:isPanelCollapsed', !isPanelCollapsed)">
            <chevron-left-icon v-if="isPanelCollapsed" />
            <chevron-right-icon v-else />
        </div>

        <div class="panel-card">
            <div class="panel-header-title">
                <view-module-icon style="margin-right: 8px" />
                Spine 对象管理 ({{ spineList.length }})
                <div style="margin: 0 0 0 auto">
                    <t-button
                        variant="text"
                        shape="square"
                        @click="emit('toggle-all')"
                        :title="isAllSelected ? '取消全选' : '全选'"
                    >
                        <template #icon>
                            <check-double-icon v-if="!isAllSelected" />
                            <close-icon v-else />
                        </template>
                    </t-button>
                </div>
            </div>

            <div class="panel-content">
                <div class="spine-scroll-list">
                    <div
                        v-for="(item, index) in spineList"
                        :key="item.id"
                        class="spine-item-row"
                        :class="{ active: activeItemId === item.id }"
                        @click="emit('select-item', item.id)"
                    >
                        <div class="item-main">
                            <t-checkbox
                                :checked="selectedIds.has(item.id)"
                                @click.stop="emit('toggle-select', item.id)"
                            />
                            <span class="item-name" :title="item.name">{{ item.name }}</span>
                        </div>

                        <div class="item-actions" @click.stop>
                            <t-button-group variant="text" size="small">
                                <t-button
                                    @click="emit('move-layer', { index, delta: -1 })"
                                    title="上移图层"
                                    size="small"
                                    style="margin: 0 2px 0 0"
                                >
                                    <template #icon><arrow-up-icon /></template>
                                </t-button>
                                <t-button
                                    @click="emit('move-layer', { index, delta: 1 })"
                                    title="下移图层"
                                    size="small"
                                    style="margin: 0 2px 0 0"
                                >
                                    <template #icon><arrow-down-icon /></template>
                                </t-button>
                                <t-button theme="danger" @click="emit('delete-item', item.id)" size="small">
                                    <template #icon><delete-icon /></template>
                                </t-button>
                            </t-button-group>
                        </div>
                    </div>
                </div>

                <!-- Individual Item Properties -->
                <div v-if="activeItem" class="active-item-controls">
                    <div class="divider-header">
                        <t-divider align="left" dashed>对象属性 ({{ activeItem.name }})</t-divider>
                        <t-tooltip content="定位相机并聚焦当前模型">
                            <t-button
                                variant="text"
                                shape="circle"
                                size="small"
                                @click="emit('focus-active')"
                                class="focus-btn-panel"
                            >
                                <template #icon><focus-icon /></template>
                            </t-button>
                        </t-tooltip>
                    </div>

                    <div class="control-item">
                        <div class="label-row">
                            <label>缩放: {{ activeItemScale.toFixed(2) }}</label>
                            <t-link theme="primary" size="small" @click="emit('update-active-scale', 1)">重置</t-link>
                        </div>
                        <t-slider
                            :model-value="activeItemScale"
                            @change="(val) => emit('update-active-scale', val)"
                            :min="0.1"
                            :max="3"
                            :step="0.01"
                        />
                    </div>

                    <div class="control-item">
                        <div class="label-row">
                            <label>旋转: {{ activeItemRotation }}°</label>
                            <t-link theme="primary" size="small" @click="emit('update-active-rotation', 0)"
                                >重置</t-link
                            >
                        </div>
                        <t-slider
                            :model-value="activeItemRotation"
                            @change="(val) => emit('update-active-rotation', val)"
                            :min="0"
                            :max="360"
                        />
                    </div>

                    <div class="control-item">
                        <div class="label-row">
                            <label>位置 & 缩放调节</label>
                            <t-link theme="primary" size="small" @click="emit('reset-active-transforms')"
                                >重置位置</t-link
                            >
                        </div>
                    </div>

                    <div class="control-item">
                        <div class="label-row">
                            <label>动作速度: {{ activeItemSpeed.toFixed(1) }}x</label>
                            <t-link theme="primary" size="small" @click="emit('update-active-speed', 1)">重置</t-link>
                        </div>
                        <t-slider
                            :model-value="activeItemSpeed"
                            @change="(val) => emit('update-active-speed', val)"
                            :min="0.1"
                            :max="2.5"
                            :step="0.1"
                        />
                    </div>

                    <div class="control-grid">
                        <t-select
                            :model-value="activeItemSkin"
                            @change="(val) => emit('update-active-skin', val)"
                            placeholder="切换皮肤"
                            :options="activeItem.skins.map((s) => ({ label: s, value: s }))"
                        />
                        <t-select
                            :model-value="activeItemAnim"
                            @change="(val) => emit('update-active-anim', val)"
                            placeholder="切换动画"
                            :options="activeItem.animations.map((a) => ({ label: a, value: a }))"
                        />
                    </div>
                </div>
                <div v-else class="no-selection-tip">请选择一个对象进行属性调整</div>

                <!-- Batch Controls -->
                <div class="batch-controls" v-if="selectedIds.size > 0">
                    <t-divider align="left" dashed>批量操作 (已选 {{ selectedIds.size }})</t-divider>

                    <div class="control-item">
                        <div class="label-row">
                            <label>批量缩放: {{ batchParams.scale.toFixed(2) }}</label>
                            <t-link theme="primary" size="small" @click="emit('reset-batch', 'scale')">重置</t-link>
                        </div>
                        <t-slider
                            :model-value="batchParams.scale"
                            @change="(val) => emit('batch-scale', val)"
                            :min="0.1"
                            :max="3"
                            :step="0.01"
                        />
                    </div>

                    <div class="control-item">
                        <div class="label-row">
                            <label>批量旋转: {{ batchParams.rotation }}°</label>
                            <t-link theme="primary" size="small" @click="emit('reset-batch', 'rotation')">重置</t-link>
                        </div>
                        <t-slider
                            :model-value="batchParams.rotation"
                            @change="(val) => emit('batch-rotation', val)"
                            :min="0"
                            :max="360"
                        />
                    </div>

                    <div class="control-grid">
                        <t-select
                            placeholder="批量切换皮肤"
                            @change="(val) => emit('batch-skin', val)"
                            :options="commonSkins.map((s) => ({ label: s, value: s }))"
                        />
                        <t-select
                            placeholder="批量切换动画"
                            @change="(val) => emit('batch-anim', val)"
                            :options="commonAnims.map((a) => ({ label: a, value: a }))"
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    ViewModuleIcon,
    CheckDoubleIcon,
    CloseIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    DeleteIcon,
    FocusIcon,
} from 'tdesign-icons-vue-next'

const props = defineProps({
    spineList: { type: Array, default: () => [] },
    selectedIds: { type: Object, default: () => new Set() },
    activeItemId: { type: [String, Number], default: null },
    activeItem: { type: Object, default: null },
    isPanelCollapsed: { type: Boolean, default: false },
    isAllSelected: { type: Boolean, default: false },
    activeItemScale: { type: Number, default: 1 },
    activeItemRotation: { type: Number, default: 0 },
    activeItemSpeed: { type: Number, default: 1 },
    activeItemSkin: { type: String, default: '' },
    activeItemAnim: { type: String, default: '' },
    commonSkins: { type: Array, default: () => [] },
    commonAnims: { type: Array, default: () => [] },
    batchParams: { type: Object, default: () => ({ scale: 1, rotation: 0 }) },
})

const emit = defineEmits([
    'update:isPanelCollapsed',
    'toggle-all',
    'select-item',
    'toggle-select',
    'move-layer',
    'delete-item',
    'update-active-scale',
    'update-active-rotation',
    'update-active-speed',
    'update-active-skin',
    'update-active-anim',
    'reset-active-transforms',
    'batch-scale',
    'batch-rotation',
    'batch-skin',
    'batch-anim',
    'reset-batch',
    'focus-active',
])
</script>

<style scoped>
.control-panel {
    position: absolute;
    right: 0px;
    top: 0px;
    width: 320px;
    height: 100%;
    z-index: 100;
    background-color: var(--td-bg-color-container);
    border-left: 1px solid var(--td-component-border);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: -2px 0 10px rgba(0, 0, 0, 0.15);
    display: flex;
    flex-direction: column;
}

.control-panel.is-collapsed {
    transform: translateX(100%);
    box-shadow: none;
}

.panel-toggle-btn {
    position: absolute;
    left: -32px;
    top: 50%;
    transform: translateY(-50%);
    width: 32px;
    height: 64px;
    background-color: var(--td-bg-color-container);
    border: 1px solid var(--td-component-border);
    border-right: none;
    border-radius: 8px 0 0 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: -4px 2px 8px rgba(0, 0, 0, 0.08);
    color: var(--td-text-color-secondary);
    transition: color 0.2s;
    user-select: none;
}
.panel-toggle-btn:hover {
    color: var(--td-brand-color);
}

.panel-card {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.panel-header-title {
    display: flex;
    align-items: center;
    font-weight: 600;
    height: 56px;
    padding: 0 16px;
    border-bottom: 1px solid var(--td-component-border);
    flex-shrink: 0;
    font-size: 14px;
}

.panel-content {
    flex: 1;
    overflow-y: auto;
    padding: 12px 16px 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.spine-scroll-list {
    border: 1px solid var(--td-component-border);
    border-radius: 6px;
    max-height: 180px;
    overflow-y: auto;
    background-color: var(--td-bg-color-page);
}

.spine-item-row {
    display: flex;
    padding: 8px 12px;
    align-items: center;
    cursor: pointer;
    border-bottom: 1px solid var(--td-component-border);
    transition: background-color 0.2s;
}

.spine-item-row:last-child {
    border-bottom: none;
}

.spine-item-row.active {
    background-color: var(--td-bg-color-component-active);
    color: var(--td-brand-color);
    font-weight: 500;
}
.spine-item-row:hover:not(.active) {
    background-color: var(--td-bg-color-container-hover);
}

.item-main {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    overflow: hidden;
}

.item-name {
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
}

.active-item-controls,
.batch-controls {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.divider-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
}

.divider-header :deep(.t-divider) {
    flex: 1;
}

.focus-btn-panel {
    margin-left: 8px;
    flex-shrink: 0;
}

.control-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.label-row {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: var(--td-text-color-secondary);
}

.control-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 4px;
}

.no-selection-tip {
    text-align: center;
    color: var(--td-text-color-placeholder);
    padding: 24px 12px;
    font-size: 12px;
    border: 1px dashed var(--td-component-border);
    border-radius: 6px;
}

.spine-scroll-list::-webkit-scrollbar,
.panel-content::-webkit-scrollbar {
    width: 5px;
    height: 5px;
}
.spine-scroll-list::-webkit-scrollbar-thumb,
.panel-content::-webkit-scrollbar-thumb {
    background: var(--td-bg-color-component-hover);
    border-radius: 3px;
}

@media (max-width: 768px) {
    .control-panel {
        width: 100%;
        height: 280px;
        bottom: 0px;
        top: auto;
        border-left: none;
        border-top: 1px solid var(--td-component-border);
        transform: translateY(0);
    }

    .control-panel.is-collapsed {
        transform: translateY(calc(100% - 44px));
        box-shadow: none;
    }

    .panel-toggle-btn {
        left: 50%;
        top: -20px;
        transform: translateX(-50%);
        width: 48px;
        height: 20px;
        border-radius: 8px 8px 0 0;
        border-right: 1px solid var(--td-component-border);
        border-bottom: none;
    }

    .panel-toggle-btn svg {
        transform: rotate(90deg);
    }

    .control-panel:not(.is-collapsed) .panel-toggle-btn svg {
        transform: rotate(270deg);
    }

    .panel-header-title {
        height: 44px;
        font-size: 13px;
    }

    .panel-content {
        padding: 8px 12px 16px;
        gap: 12px;
    }
}
</style>
