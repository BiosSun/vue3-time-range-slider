<template>
    <div class="time-range-slider__slider">
        <div class="time-range-slider__slider__title">
            {{ title }}
        </div>

        <TimeRuler />

        <template v-for="(track, index) of disabledTracks" :key="index">
            <div
                class="time-range-slider__slider__disabled-rail"
                :style="{
                    '--start': track.start,
                    '--end': track.end,
                }"
            />
        </template>

        <div
            v-if="activatedRange.track"
            class="time-range-slider__slider__rail"
            :style="{
                '--start': activatedRange.track.start,
                '--end': activatedRange.track.end,
            }"
        />

        <div
            v-if="activatedRange.start"
            class="time-range-slider__slider__point"
            :data-point="activatedRange.start.flag"
            :style="{
                '--position': activatedRange.start.position,
            }"
        />

        <div
            v-if="activatedRange.end"
            class="time-range-slider__slider__point"
            :data-point="activatedRange.end.flag"
            :style="{
                '--position': activatedRange.end.position,
            }"
        />
    </div>
</template>
<script lang="ts" setup>
import { format, startOfDay, endOfDay, max as maxDate, min as minDate } from 'date-fns'
import {
    Range,
    getStartPoint,
    getEndPoint,
    isSameDay,
    SliderStep,
    STEP_INFOS,
    isValidTime,
    D_MS,
} from './util'
import TimeRuler from './time-ruler.vue'

const {
    date,
    timeRange,
    hintTime,
    step: stepKey,
    min,
    max,
} = defineProps<{
    date: Date
    timeRange: Range
    hintTime?: Date
    step: SliderStep
    min?: Date
    max?: Date
}>()

const step = $computed(() => STEP_INFOS[stepKey])
const day = $computed(() => ({ date, start: startOfDay(date), end: endOfDay(date) }))

const title = $computed(() => {
    return hintTime ? format(hintTime, 'yyyy-MM-dd ' + step.tf) : format(day.date, 'yyyy-MM-dd')
})

const activatedRange: { track?: Track; start?: Thumb; end?: Thumb } = $computed(() => {
    const startTime = step.floor(getStartPoint(timeRange))
    const endTime = step.ceil(getEndPoint(timeRange))

    const startThumb = buildThumb('start', startTime)
    const endThumb = buildThumb('end', endTime)

    const track = buildTrack(startTime, endTime)

    return { track, start: startThumb, end: endThumb }
})

const disabledTracks: Track[] = $computed(() => {
    const tracks = []

    const minTrackEndTime = step.ceil(step.prev(min))
    const maxTrackStartTime = step.floor(step.next(max))

    const minTrack = buildTrack(day.start, minTrackEndTime)
    const maxTrack = buildTrack(maxTrackStartTime, day.end)

    if (minTrack) {
        tracks.push(minTrack)
    }

    if (maxTrack) {
        tracks.push(maxTrack)
    }

    return tracks
})

// -----------------------------------------------------------------------------

interface Track {
    start: number
    end: number
}

interface Thumb {
    flag: string
    position: number
}

function buildTrack(start: Date | undefined, end: Date | undefined): Track | undefined {
    // 无效的开始/结束时间
    if (!isValidTime(start) || !isValidTime(end) || start >= end) {
        return undefined
    }

    // 所传入超始时间都不在当前所表示的这一天内
    if (end < day.start || start > day.end) {
        return undefined
    }

    const startTime = maxDate([start, day.start])
    const endTime = minDate([end, day.end])

    const startPosition = timeToPosition(startTime)
    const endPosition = timeToPosition(endTime)

    return {
        start: startPosition,
        end: endPosition,
    }
}

function buildThumb(flag: string, time: Date | undefined): Thumb | undefined {
    // 无效的时间
    if (!isValidTime(time)) {
        return undefined
    }

    // 所传入时间不在当前所表示的这一天内
    if (time < day.start || time > day.end) {
        return undefined
    }

    const position = timeToPosition(time)

    return {
        flag,
        position,
    }
}

// NOTE: 这里的 position 指的是相对于 SliderBar 内容区域左侧的水平位置（ [0 ~ 1] ）
function timeToPosition(time: Date): number {
    return (time.valueOf() - day.start.valueOf()) / (day.end.valueOf() - day.start.valueOf())
}
</script>
