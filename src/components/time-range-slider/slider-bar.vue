<template>
    <div ref="rootEl" class="time-range-slider__slider-bar">
        <div class="time-range-slider__slider-bar__title">
            {{ title }}
        </div>

        <TimeRuler />

        <template v-for="(rail, index) of disabledRails" :key="index">
            <div
                class="time-range-slider__slider-bar__disabled-rail"
                :style="{
                    '--start': rail[0],
                    '--end': rail[1],
                }"
            />
        </template>

        <div
            v-if="rail !== undefined"
            class="time-range-slider__slider-bar__rail"
            :style="{
                '--start': rail[0],
                '--end': rail[1],
            }"
        />

        <div
            v-if="startPoint !== undefined"
            class="time-range-slider__slider-bar__point"
            :style="{
                '--position': startPoint,
            }"
        />

        <div
            v-if="endPoint !== undefined"
            class="time-range-slider__slider-bar__point"
            :style="{
                '--position': endPoint,
            }"
        />
    </div>
</template>
<script lang="ts" setup>
import { format, startOfDay, endOfDay, clamp as clampTime, isEqual } from 'date-fns'
import { Range, getStartPoint, getEndPoint } from './util'
import TimeRuler from './time-ruler.vue'

const props = defineProps<{
    date: Date
    timeRange?: Range
    min?: Date
    max?: Date
}>()

const rootEl = $ref<HTMLDivElement>()

const title = $computed(() => format(props.date, 'yyyy-MM-dd'))

const startTimeOfDay = $computed(() => startOfDay(props.date))
const endTimeOfDay = $computed(() => endOfDay(props.date))
const intervalOfDay = $computed(() => ({ start: startTimeOfDay, end: endTimeOfDay }))

const startTime = $computed(() => getStartPoint(props.timeRange))
const endTime = $computed(() => getEndPoint(props.timeRange))

// 选中区域的起点和终点（若起点或终点不在当前 SliderBar 所表示的一天的时间范围中，则为 undefined）
const startPoint = $computed(() => (isIn(startTime) ? timeToPosition(startTime) : undefined))
const endPoint = $computed(() => (isIn(endTime) ? timeToPosition(endTime) : undefined))

// 高亮区域（选中区域与当前 SliderBar 所表示的一天的时间范围的交集）
const rail = $computed(() => {
    const start = startPoint !== undefined ? startPoint : isEarlier(startTime) ? 0 : undefined
    const end = endPoint !== undefined ? endPoint : isLater(endTime) ? 1 : undefined
    return start !== undefined && end !== undefined ? [start, end] : undefined
})

// TODO: 变量名不太好
const clampInterval = $computed(() => {
    let start = clampTime(props.min ?? startTimeOfDay, intervalOfDay)
    let end = clampTime(props.max ?? endTimeOfDay, intervalOfDay)

    if (start >= end) {
        end = start = startTimeOfDay
    }

    return { start, end }
})

// 禁止选择标识区域
const disabledRails = $computed(() => {
    const rails: [number, number][] = []

    if (!isEqual(clampInterval.start, startTimeOfDay)) {
        rails.push([0, timeToPosition(clampInterval.start)!])
    }

    if (!isEqual(clampInterval.end, endTimeOfDay)) {
        rails.push([timeToPosition(clampInterval.end)!, 1])
    }

    return rails
})

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

// NOTE: 这里的 position 指的是相对于 SliderBar 内容区域左侧的水平位置（ [0 ~ 1] ）

function timeToPosition(time: Date | undefined): number | undefined {
    if (time === undefined) {
        return undefined
    }

    return (
        (time.valueOf() - startTimeOfDay.valueOf()) /
        (endTimeOfDay.valueOf() - startTimeOfDay.valueOf())
    )
}
</script>