<template>
    <div class="r-time-range-direct-picker__day-bar">
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
import { TimeRange, getStartTime, getEndTime } from './util'
import TimeRuler from './time-ruler.vue'

const props = defineProps<{
    date: Date
    timeRange: TimeRange
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

const title = $computed(() => format(props.date, 'yyyy-MM-dd'))

const startTimeOfDate = $computed(() => startOfDay(props.date))
const endTimeOfDate = $computed(() => endOfDay(props.date))

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

function isIn(time: Date | undefined): boolean {
    return !!(time && time >= startTimeOfDate && time <= endTimeOfDate)
}

function isEarlier(time: Date | undefined): boolean {
    return !!(time && time < startTimeOfDate)
}

function isLater(time: Date | undefined): boolean {
    return !!(time && time > endTimeOfDate)
}

function timeToPosition(time: Date | undefined): number | undefined {
    if (time === undefined) {
        return undefined
    }

    return (
        (time.valueOf() - startTimeOfDate.valueOf()) /
        (endTimeOfDate.valueOf() - startTimeOfDate.valueOf())
    )
}
</script>
<style lang="scss">
.r-time-range-direct-picker__day-bar {
    position: relative;
    height: var(--r-time-range-direct-picker__day-bar--height, 34px);

    + .r-time-range-direct-picker__day-bar {
        border-top: 1px solid #000;
    }

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
