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
import TimeRuler from './time-ruler.vue'

const props = defineProps<{
    date: Date
    timeRange: Date[] | undefined
}>()

const emit = defineEmits(['point', 'start', 'end'])

const title = $computed(() => format(props.date, 'yyyy-MM-dd'))

const startTimeOfDate = $computed(() => startOfDay(props.date))
const endTimeOfDate = $computed(() => endOfDay(props.date))

const startTime = $computed(() => props.timeRange?.[0])
const endTime = $computed(() => props.timeRange?.[1])

const startPoint = $computed(() => (isIn(startTime) ? timeToPosition(startTime) : undefined))
const endPoint = $computed(() => (isIn(endTime) ? timeToPosition(endTime) : undefined))
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
