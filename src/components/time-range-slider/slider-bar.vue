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

        <div class="time-range-slider__slider__date" ref="dateEl">
            <template v-if="isWeekend">
                {{ dateStrFirstPart
                }}<strong class="time-range-slider__slider__date__weekend-flag">{{
                    dateStrSecondPart
                }}</strong>
            </template>
            <template v-else>
                {{ dateStrFirstPart + dateStrSecondPart }}
            </template>
        </div>

        <div
            v-if="activatedRange.track"
            class="time-range-slider__slider__rail"
            :style="{
                '--start': activatedRange.track.start,
                '--end': activatedRange.track.end,
            }"
        >
            <div class="time-range-slider__slider__rail__mover" :data-mover="true" />
        </div>

        <SliderPoint
            v-if="activatedRange.start"
            :side="activatedRange.start.side"
            :position="activatedRange.start.position"
        />

        <SliderPoint
            v-if="activatedRange.end"
            :side="activatedRange.end.side"
            :position="activatedRange.end.position"
        />

        <div
            v-for="position of hintTimeLinePositions"
            class="time-range-slider__slider__hint-time-line"
            :style="{ '--position': position }"
        />

        <div v-if="hintTimesStr" class="time-range-slider__slider__hint-time" ref="hintTimeEl">
            {{ hintTimesStr }}
        </div>
    </div>
</template>
<script lang="ts" setup>
import { onMounted, watch } from 'vue'
import {
    format,
    startOfDay,
    endOfDay,
    max as maxDate,
    min as minDate,
    isWeekend as _isWeekend,
} from 'date-fns'
import {
    Range,
    getStartPoint,
    getEndPoint,
    SliderStep,
    STEP_INFOS,
    isValidTime,
    clamp,
    PointRelativeSide,
    PointFixedSide,
    getMiddleTime,
} from './util'
import TimeRuler from './time-ruler.vue'
import SliderPoint from './slider-point.vue'
import { formatHintTimes } from './use-hint-times'

const {
    date,
    timeRange,
    hintTimes,
    hintTimeLines,
    step: stepKey,
    min,
    max,
} = defineProps<{
    date: Date
    timeRange: Range
    hintTimes?: Date[] | undefined
    hintTimeLines?: boolean
    step: SliderStep
    min?: Date
    max?: Date
}>()

const step = $computed(() => STEP_INFOS[stepKey])
const day = $computed(() => ({ start: startOfDay(date), end: endOfDay(date) }))

const isWeekend = $computed(() => _isWeekend(date))

const dateStrFirstPart = $computed(() => {
    return date.getFullYear() + '-' + (date.getMonth() + 1).toString().padStart(2, '0') + '-'
})

const dateStrSecondPart = $computed(() => {
    return date.getDate().toString().padStart(2, '0')
})

const hintTimesStr = $computed(() => formatHintTimes(hintTimes, step))
const hintTimeLinePositions = $computed(() =>
    hintTimes && hintTimeLines ? hintTimes.map((hintTime) => timeToPosition(hintTime)) : undefined,
)

const barEl = $ref<HTMLElement | null>(null)
const dateEl = $ref<HTMLElement | null>(null)
const hintTimeEl = $ref<HTMLElement | null>(null)

onMounted(updateHintTimePosition)
watch($$(hintTimesStr), updateHintTimePosition, { flush: 'post' })

function updateHintTimePosition() {
    if (!hintTimesStr || !hintTimes) {
        return
    }

    if (!barEl || !hintTimeEl || !dateEl) {
        return
    }

    const barWidth = barEl.clientWidth
    const hintTimeWidth = hintTimeEl.clientWidth
    const dateWidth = dateEl.clientWidth

    const position = timeToPosition(hintTimes.length === 1 ? hintTimes[0] : getMiddleTime(hintTimes))
    const center = barWidth * position
    const left = center - hintTimeWidth / 2
    const minLeft = 5 + dateWidth + 5
    const maxLeft = barWidth - 5 - hintTimeWidth
    const realLeft = clamp(left, minLeft, maxLeft)

    hintTimeEl.style.setProperty('left', realLeft + 'px')
}

const activatedRange: { track?: Track; start?: Thumb; end?: Thumb } = $computed(() => {
    const startPoint = getStartPoint(timeRange)
    const endPoint = getEndPoint(timeRange)

    const startTime = step.floor(startPoint.time)
    const endTime = step.ceil(endPoint.time)

    const startThumb = buildThumb('start', startPoint.side, startTime)
    const endThumb = buildThumb('end', endPoint.side, endTime)

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
    flag: PointRelativeSide
    side: PointFixedSide
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

function buildThumb(
    flag: PointRelativeSide,
    side: PointFixedSide,
    time: Date | undefined,
): Thumb | undefined {
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
        side,
        position,
    }
}

// NOTE: 这里的 position 指的是相对于 SliderBar 内容区域左侧的水平位置（ [0 ~ 1] ）
function timeToPosition(time: Date): number {
    return (time.valueOf() - day.start.valueOf()) / (day.end.valueOf() - day.start.valueOf())
}
</script>
