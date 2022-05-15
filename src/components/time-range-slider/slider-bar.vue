<template>
    <div class="time-range-slider__slider" ref="barEl">
        <template v-for="(track, index) of disabledTracks" :key="index">
            <div
                class="time-range-slider__slider__disabled-rail"
                :style="{
                    '--start': track.start,
                    '--end': track.end,
                }"
            />
        </template>

        <TimeRuler />

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

        <div
            v-if="hintTimeLinePosition !== undefined"
            class="time-range-slider__slider__hint-time-line"
            :style="{
                '--position': hintTimeLinePosition,
            }"
        />

        <div class="time-range-slider__slider__date" ref="dateEl">
            {{ dateStr }}
        </div>

        <div v-if="hintTimeStr" class="time-range-slider__slider__hint-time" ref="hintTimeEl">
            {{ hintTimeStr }}
        </div>
    </div>
</template>
<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue'
import { format, startOfDay, endOfDay, max as maxDate, min as minDate } from 'date-fns'
import {
    Range,
    getStartPoint,
    getEndPoint,
    SliderStep,
    STEP_INFOS,
    isValidTime,
    clamp,
} from './util'
import TimeRuler from './time-ruler.vue'

const {
    date,
    timeRange,
    hintTime,
    hintTimeLine,
    step: stepKey,
    min,
    max,
} = defineProps<{
    date: Date
    timeRange: Range
    hintTime?: Date
    hintTimeLine?: boolean
    step: SliderStep
    min?: Date
    max?: Date
}>()

const step = $computed(() => STEP_INFOS[stepKey])
const day = $computed(() => ({ date, start: startOfDay(date), end: endOfDay(date) }))

const dateStr = $computed(() => format(day.date, 'yyyy-MM-dd'))
const hintTimeStr = $computed(() => (hintTime ? format(hintTime, step.tf) : undefined))
const hintTimeLinePosition = $computed(() =>
    hintTime && hintTimeLine ? timeToPosition(hintTime) : undefined,
)

const barEl = $ref<HTMLElement | null>(null)
const dateEl = $ref<HTMLElement | null>(null)
const hintTimeEl = $ref<HTMLElement | null>(null)

onMounted(updateHintTimePosition)
watch($$(hintTimeStr), updateHintTimePosition, { flush: 'post' })

function updateHintTimePosition() {
    if (!hintTimeStr) {
        return
    }

    if (!barEl || !hintTimeEl || !dateEl) {
        return
    }

    const barWidth = barEl.clientWidth
    const hintTimeWidth = hintTimeEl.clientWidth
    const dateWidth = dateEl.clientWidth

    const position = timeToPosition(hintTime!)
    const center = barWidth * position
    const left = center - hintTimeWidth / 2
    const minLeft = 5 + dateWidth + 5
    const maxLeft = barWidth - 5 - hintTimeWidth
    const realLeft = clamp(left, minLeft, maxLeft)

    hintTimeEl.style.setProperty('left', realLeft + 'px')
}

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
