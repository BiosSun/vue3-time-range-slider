<template>
    <div style="width: 600px; margin: 30px auto">
        <div style="display: flex; gap: 16px; align-items: center; margin-bottom: 16px">
            <div style="display: flex; gap: 8px; align-items: center">
                <DateTimeInput
                    :modelValue="leftInput.value"
                    :min="min"
                    :max="max"
                    :warned="inputWarned"
                    @update:modelValue="leftInput.onChange"
                    @focus="leftInput.focused = true"
                    @blur="leftInput.focused = false"
                />
            </div>
            <span>-</span>
            <div style="display: flex; gap: 8px; align-items: center">
                <DateTimeInput
                    :modelValue="rightInput.value"
                    :min="min"
                    :max="max"
                    :warned="inputWarned"
                    @update:modelValue="rightInput.onChange"
                    @focus="rightInput.focused = true"
                    @blur="rightInput.focused = false"
                />
            </div>
        </div>
        <div class="time-range-slider__slider-bar-container" ref="sliderContainer">
            <template v-for="date of slider.dates" :key="date.valueOf()">
                <SliderBar
                    :date="date"
                    :min="min"
                    :max="max"
                    :timeRange="slider.range"
                    @picking="slider.onPicking"
                    @picked="slider.onPicked"
                    @mousedown="slider.onItemMouseDown"
                />
            </template>
        </div>
    </div>
</template>
<script lang="ts" setup>
import {
    differenceInMilliseconds,
    eachDayOfInterval,
    endOfDay,
    min as minDate,
    max as maxDate,
    subMilliseconds,
    addMilliseconds,
} from 'date-fns'
import { computed, reactive, watch } from 'vue'
import SliderBar from './slider-bar.vue'
import DateTimeInput from './date-time-input.vue'
import {
    Range,
    isValidTime,
    isValidRange,
    getLeftPoint,
    getRightPoint,
    clampTime as _clampTime,
    clamp,
    assert,
    isSameTime,
} from './util'

const {
    modelValue: _modelValue,
    min,
    max,
    limit,
} = defineProps<{
    modelValue?: Range
    min: Date
    max: Date
    limit: number
}>()

const modelValue = $computed(() => {
    const left = getLeftPoint(_modelValue)
    const right = getRightPoint(_modelValue)
    return [isValidTime(left) ? left : undefined, isValidTime(right) ? right : undefined]
})

watch(
    [$$(min), $$(max)],
    ([min, max]) => {
        assert(isValidTime(min), 'min time is invalid date value')
        assert(isValidTime(max), 'max time is invalid date value')
        assert(min.valueOf() < max.valueOf(), 'max time is less than or equal to min time')
    },
    { immediate: true },
)

const emit = defineEmits<{
    (e: 'update:modelValue', v: Range | undefined): void
    (e: 'change', v: Range | undefined): void
    (e: 'startPicking', v: Range | undefined): void
    (e: 'picking', v: Range | undefined): void
    (e: 'endPicking', v: Range | undefined): void
}>()

const leftInput = reactive({
    value: undefined as Date | undefined,
    outputValue: undefined as Date | undefined,
    focused: false,
    warned: false,
    setValue(value: Date | undefined) {
        leftInput.value = value
        leftInput.outputValue =
            value && rightInput.outputValue ? clampTime(value, rightInput.outputValue) : value
    },
    onChange(value: Date | undefined) {
        leftInput.setValue(value)
        emitChange([leftInput.outputValue, rightInput.outputValue])
    },
})

const rightInput = reactive({
    value: undefined as Date | undefined,
    outputValue: undefined as Date | undefined,
    focused: false,
    warned: false,
    setValue(value: Date | undefined) {
        rightInput.value = value
        rightInput.outputValue =
            value && leftInput.outputValue ? clampTime(value, leftInput.outputValue) : value
    },
    onChange(value: Date | undefined) {
        rightInput.setValue(value)
        emitChange([leftInput.outputValue, rightInput.outputValue])
    },
})

const inputWarned = $computed(() => {
    return limit && leftInput.value && rightInput.value
        ? differenceInMilliseconds(leftInput.value, rightInput.value) > limit
        : false
})

const inputFocused = $computed(() => leftInput.focused || rightInput.focused)

function resetInputValue(range: Range, force: boolean) {
    if (force || !isSameTime(range[0], leftInput.outputValue)) {
        leftInput.value = leftInput.outputValue = range[0]
    }

    if (force || !isSameTime(range[1], rightInput.outputValue)) {
        rightInput.value = rightInput.outputValue = range[1]
    }
}

type SliderState = 'WAIT' | 'LEFT_PICKING' | 'LEFT_PICKED' | 'RIGHT_PICKING'
type SliderAction = 'picking' | 'picked'

const sliderContainer: HTMLElement = $ref()

const slider = reactive({
    dates: computed(() => eachDayOfInterval({ start: min, end: max })),
    state: 'WAIT' as SliderState,
    range: [undefined, undefined] as Range,
    activated: false,
    itemWidth: 0,
    itemHeight: 0,

    get left(): Date | undefined {
        return slider.range[0]
    },

    get right(): Date | undefined {
        return slider.range[1]
    },

    // 一个简单的状态机，处理与选择时间区间操作相关的所有交互逻辑
    ACTION_HANDLERS: {
        WAIT: {
            picking(time: Date | undefined) {
                const clampedTime = clampTime(time)
                if (clampedTime && slider.setRange([clampedTime, undefined])) {
                    emitStartPicking(slider.range)
                    emitPicking(slider.range)
                    slider.syncToInput()
                    slider.activate()
                    return 'LEFT_PICKING'
                }
            },

            picked() {
                // 有时用户会在其它地方按下鼠标，并在 SliderBar 组件上释放，此时会触发 picked 事件，这种情况直接忽略即可。
            },
        },

        LEFT_PICKING: {
            picking(time: Date | undefined) {
                if (slider.setRangePoint('left', clampTime(time))) {
                    emitPicking(slider.range)
                    slider.syncToInput()
                }
            },

            picked(time: Date | undefined) {
                if (slider.setRangePoint('left', clampTime(time))) {
                    emitPicking(slider.range)
                    slider.syncToInput()
                    return 'LEFT_PICKED'
                }
            },
        },

        LEFT_PICKED: {
            picking(time: Date | undefined) {
                if (slider.setRangePoint('right', clampTime(time, slider.left!))) {
                    emitPicking(slider.range)
                    slider.syncToInput()
                    return 'RIGHT_PICKING'
                }
            },

            picked() {
                // 有时用户会在其它地方按下鼠标，并在 SliderBar 组件上释放，此时会触发 picked 事件，这种情况直接忽略即可。
            },
        },

        RIGHT_PICKING: {
            picking(time: Date | undefined) {
                if (slider.setRangePoint('right', clampTime(time, slider.left!))) {
                    emitPicking(slider.range)
                    slider.syncToInput()
                }
            },

            picked(time: Date | undefined) {
                if (slider.setRangePoint('right', clampTime(time, slider.left!))) {
                    emitEndPicking(slider.range)
                }

                emitEndPicking(slider.range)
                slider.syncToInput()
                emitChange(slider.range as Range) // WAIT
                slider.setRange(undefined)
                slider.inactivate()

                return 'WAIT'
            },
        },
    } as {
        [state in SliderState]: {
            [action in SliderAction]: (time: Date | undefined) => SliderState | void
        }
    },

    setRange(range: Range | undefined = [undefined, undefined]) {
        if (!isValidRange(range)) {
            return false
        }

        slider.range = [...range]

        return true
    },

    setRangePoint(point: 'left' | 'right', time: Date | undefined) {
        if (!isValidTime(time)) {
            return false
        }

        slider.range[point === 'left' ? 0 : 1] = time

        return true
    },

    syncToInput() {
        resetInputValue(slider.range, true)
    },

    // 必须确保在触发 picking 或 picked 事件时，time 不能是 undefined
    // 若有 clean 操作，那么应当是一个额外的事件
    onPicking(time: Date | undefined) {
        slider.dispatch('picking', time)
    },

    onPicked(time: Date | undefined) {
        slider.dispatch('picked', time)
    },

    onItemMouseDown(event: MouseEvent) {
        // When the slider is in activated state, it doesn't make sense to handle the item's
        // mousedown event.
        if (slider.activated) {
            return
        }

        const itemRect = (event.currentTarget as HTMLElement).getBoundingClientRect()

        slider.itemWidth = itemRect.width
        slider.itemHeight = itemRect.height

        slider.onPicking(slider.getTimeByMouseEvent(event))
    },

    onDocumentMouseMove(event: MouseEvent) {
        slider.onPicking(slider.getTimeByMouseEvent(event))
    },

    onDocumentMouseUp(event: MouseEvent) {
        slider.onPicked(slider.getTimeByMouseEvent(event))
    },

    activate() {
        slider.activated = true
        document.addEventListener('mousemove', slider.onDocumentMouseMove, false)
        document.addEventListener('mouseup', slider.onDocumentMouseUp, false)
    },

    inactivate() {
        slider.activated = false
        document.removeEventListener('mousemove', slider.onDocumentMouseMove, false)
        document.removeEventListener('mouseup', slider.onDocumentMouseUp, false)
    },

    getTimeByMouseEvent({ clientX, clientY }: MouseEvent) {
        const { itemWidth, itemHeight, dates } = slider
        const containerRect = sliderContainer.getBoundingClientRect()
        const positionOnContainer = clamp(clientY - containerRect.top, 0, containerRect.height)

        let itemIndex = (positionOnContainer + sliderContainer.scrollTop) / itemHeight
        itemIndex = clamp(Math.floor(itemIndex), 0, dates.length - 1)

        let itemPosition = (clientX - containerRect.left) / (itemWidth - 1)
        itemPosition = clamp(itemPosition, 0, 1)

        return dayPositionToTime(dates[itemIndex], itemPosition)
    },

    dispatch(action: SliderAction, time: Date | undefined) {
        slider.state =
            slider.ACTION_HANDLERS[slider.state as SliderState][action](time) ?? slider.state
    },
})

watch(
    [$$(modelValue), computed(() => slider.state)],
    ([modelValue, state]) => {
        if (state === 'WAIT') {
            slider.setRange(modelValue)
        }
    },
    { immediate: true, deep: true },
)

watch(
    [$$(modelValue), $$(inputFocused)],
    ([modelValue, focused]) => {
        if (!focused) {
            resetInputValue(modelValue, false)
        }
    },
    { immediate: true, deep: true },
)

function emitStartPicking(range: Range) {
    emit('startPicking', range)
}

function emitPicking(range: Range) {
    emit('picking', range)
}

function emitEndPicking(range: Range) {
    emit('endPicking', range)
}

function emitChange(range: Range) {
    emit('update:modelValue', range)
    emit('change', range)
}

function clampTime(time: Date | undefined, reference?: Date) {
    if (!isValidTime(time)) {
        return undefined
    }

    let start: Date = min
    let end: Date = max

    if (reference && limit) {
        start = maxDate([start, subMilliseconds(reference, limit)])
        end = minDate([end, addMilliseconds(reference, limit)])

        if (start.valueOf() > end.valueOf()) {
            return undefined
        }
    }

    return _clampTime(time, start, end)
}

const MILLISECONDS_OF_MINUTE = 1000 * 60
const MINUTES_OF_DAY = 60 * 24
const MILLISECONDS_OF_DAY = MILLISECONDS_OF_MINUTE * MINUTES_OF_DAY

function dayPositionToTime(startTimeOfDay: Date, position: number): Date {
    return new Date(
        Math.min(
            startTimeOfDay.valueOf() + Math.round(position * MILLISECONDS_OF_DAY),
            endOfDay(startTimeOfDay).valueOf(),
        ),
    )
}
</script>