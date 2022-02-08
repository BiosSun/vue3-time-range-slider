<template>
    <div
        ref="rootEl"
        class="r-time-range-direct-picker__day-bar"
        @mousedown="onMouseDown"
        @mouseup="onMouseUp"
        @mousemove="onMouseMove"
    >
        <div class="r-time-range-direct-picker__day-bar__title">
            {{ title }}
        </div>

        <TimeRuler />

        <div
            v-if="rail !== undefined"
            class="r-time-range-direct-picker__day-bar__rail"
            :style="{
                '--start': rail[0],
                '--end': rail[1],
            }"
        />

        <div
            v-if="startPoint !== undefined"
            class="r-time-range-direct-picker__day-bar__point"
            :style="{
                '--position': startPoint,
            }"
        />

        <div
            v-if="endPoint !== undefined"
            class="r-time-range-direct-picker__day-bar__point"
            :style="{
                '--position': endPoint,
            }"
        />
    </div>
</template>
<script lang="ts" setup>
/// <reference types="vue/macros-global" />

import { format, startOfDay, endOfDay } from 'date-fns'
import { TimeRange, PickingTimeRange, getStartTime, getEndTime, clamp } from './util'
import TimeRuler from './time-ruler.vue'

const MILLISECONDS_OF_MINUTE = 1000 * 60
const MINUTES_OF_DAY = 60 * 24
const MILLISECONDS_OF_DAY = MILLISECONDS_OF_MINUTE * MINUTES_OF_DAY

const props = defineProps<{
    date: Date
    timeRange?: TimeRange | PickingTimeRange
    activated?: boolean
}>()

const emit = defineEmits([
    /**
     * picking 事件会在两种情况下触发：
     *
     * 1. 若 activated 为 false，则仅当用户在 DayBar 上按下鼠标时触发该事件；
     * 2. 若为 true，则还会在用户移动鼠标时触发该事件。
     *
     * 当 picking 事件触发时，事件参数为鼠标触发点所对应的时刻（单位：分钟）。
     */
    'picking',

    /** 当用户在 DayBar 上松开鼠标时，将会触发 picked 事件，其参数与 picking 事件相同。 */
    'picked',
])

const rootEl = $ref<HTMLDivElement | null>(null)

const title = $computed(() => format(props.date, 'yyyy-MM-dd'))

const startTimeOfDay = $computed(() => startOfDay(props.date))
const endTimeOfDay = $computed(() => endOfDay(props.date))

const startTime = $computed(() => getStartTime(props.timeRange))
const endTime = $computed(() => getEndTime(props.timeRange))

// 选中区域的起点和终点（若起点或终点不在当前 DayBar 所表示的一天的时间范围中，则为 undefined）
const startPoint = $computed(() => (isIn(startTime) ? timeToPosition(startTime) : undefined))
const endPoint = $computed(() => (isIn(endTime) ? timeToPosition(endTime) : undefined))

// 高亮区域（选中区域与当前 DayBar 所表示的一天的时间范围的交集）
const rail = $computed(() => {
    const start = startPoint !== undefined ? startPoint : isEarlier(startTime) ? 0 : undefined
    const end = endPoint !== undefined ? endPoint : isLater(endTime) ? 1 : undefined
    return start !== undefined && end !== undefined ? [start, end] : undefined
})

function onMouseDown(event: MouseEvent) {
    emit('picking', getMouseTime(event))
}

function onMouseUp(event: MouseEvent) {
    emit('picked', getMouseTime(event))
}

function onMouseMove(event: MouseEvent) {
    if (props.activated) {
        emit('picking', getMouseTime(event))
    }
}

// -----------------------------------------------------------------------------

function isIn(time: Date | undefined): boolean {
    return !!(time && time >= startTimeOfDay && time <= endTimeOfDay)
}

function isEarlier(time: Date | undefined): boolean {
    return !!(time && time < startTimeOfDay)
}

function isLater(time: Date | undefined): boolean {
    return !!(time && time > endTimeOfDay)
}

// NOTE: 这里的 position 指的是相对于 DayBar 内容区域左侧的水平位置（ [0 ~ 1] ）

function timeToPosition(time: Date | undefined): number | undefined {
    if (time === undefined) {
        return undefined
    }

    return (
        (time.valueOf() - startTimeOfDay.valueOf()) /
        (endTimeOfDay.valueOf() - startTimeOfDay.valueOf())
    )
}

function positionToTime(position: number | undefined): Date | undefined {
    if (position === undefined) {
        return undefined
    }

    return new Date(
        Math.min(
            startTimeOfDay.valueOf() + Math.round(position * MILLISECONDS_OF_DAY),
            endTimeOfDay.valueOf(),
        ),
    )
}

function getMousePosition(event: MouseEvent): number | undefined {
    if (!rootEl) {
        return undefined
    }

    const rect = rootEl.getBoundingClientRect()
    const x = event.clientX - rect.left
    const position = x / (rect.width - 1)

    return clamp(position, 0, 1)
}

function getMouseTime(event: MouseEvent): Date | undefined {
    return positionToTime(getMousePosition(event))
}
</script>
<style lang="scss">
.r-time-range-direct-picker__day-bar {
    position: relative;
    height: var(--r-time-range-direct-picker__day-bar--height, 34px);
    border-bottom: 1px solid #000;

    .r-time-range-direct-picker__time-ruler {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
    }
}

.r-time-range-direct-picker__day-bar__title {
    position: absolute;
    left: 5px;
    top: 0px;
    font-size: 12px;
    line-height: 21px;
    user-select: none;
}

.r-time-range-direct-picker__day-bar__track {
    position: absolute;
    left: 1px;
    right: 1px;
    top: 0;
    bottom: 0;
}

.r-time-range-direct-picker__day-bar__rail {
    position: absolute;
    top: 0;
    bottom: 0;
    left: calc(100% * var(--start));
    right: calc(100% - 100% * var(--end));
    background: #00aaff30;
}

.r-time-range-direct-picker__day-bar__point {
    position: absolute;
    top: 0;
    bottom: 0;
    left: calc(100% * var(--position) - 2px * var(--position));
    width: 2px;
    background: #00aaff;
}
</style>
