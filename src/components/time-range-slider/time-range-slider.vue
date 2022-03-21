<template>
    <div style="width: 600px; margin: 30px auto">
        <div style="display: flex; gap: 16px; align-items: center; margin-bottom: 16px">
            <div style="display: flex; gap: 8px; align-items: center">
                <DateTimeInput
                    :modelValue="leftInput.value"
                    :min="min"
                    :max="max"
                    :step="stepKey"
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
                    :step="stepKey"
                    :warned="inputWarned"
                    @update:modelValue="rightInput.onChange"
                    @focus="rightInput.focused = true"
                    @blur="rightInput.focused = false"
                />
            </div>
        </div>
        <div class="time-range-slider__sliders__container" ref="sliderContainer">
            <div
                class="time-range-slider__sliders__list"
                @mousemove="slider.onListMouseMove"
                @mouseleave="slider.onListMouseLeave"
            >
                <SliderBar
                    v-for="date of slider.dates"
                    :key="date.valueOf()"
                    :date="date"
                    :min="min"
                    :max="max"
                    :step="stepKey"
                    :timeRange="slider.range"
                    :hintTime="slider.hintTime"
                    @mousedown="slider.onItemMouseDown"
                />
            </div>
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
    isSameDay,
} from 'date-fns'
import { computed, reactive, watch } from 'vue'
import SliderBar from './slider-bar.vue'
import DateTimeInput from './date-time-input.vue'
import {
    Range,
    isValidTime,
    isValidRange,
    isFullRange,
    getLeftPoint,
    getRightPoint,
    clampTime as _clampTime,
    clamp,
    assert,
    isSameTime,
    SliderStep,
    D_MS,
    STEP_INFOS,
    detectLeftButton,
} from './util'
import { $computed } from 'vue/macros'

// API
// -----------------------------------------------------------------------------

const {
    modelValue: _modelValue,
    min: _min,
    max: _max,
    limit: _limit,
    step: stepKey = 'second',
} = defineProps<{
    modelValue?: Range
    step?: SliderStep
    min: Date
    max: Date
    limit?: number
}>()

const step = $computed(() => STEP_INFOS[stepKey])

const modelValue = $computed(() => {
    const left = getLeftPoint(_modelValue)
    const right = getRightPoint(_modelValue)
    return [isValidTime(left) ? left : undefined, isValidTime(right) ? right : undefined]
})

const _min_max = $computed(() => {
    assert(isValidTime(_min), 'min time is invalid date value')
    assert(isValidTime(_max), 'max time is invalid date value')

    const cmin = step.floor(_min)
    const cmax = step.floor(_max)

    assert(cmin.valueOf() < cmax.valueOf(), 'max time is less than or equal to min time')

    return [cmin, cmax]
})

const min = $computed(() => _min_max[0])
const max = $computed(() => _min_max[1])

const limit = $computed(() => {
    const value = _limit

    if (value == null) {
        return undefined
    }

    assert(Number.isFinite(value), 'limit is invalid number value')

    const normalizedValue = Math.floor(value / step.ms) * step.ms

    assert(normalizedValue > 0, 'limit should be at least one step unit')

    return normalizedValue
})

const emit = defineEmits<{
    (e: 'update:modelValue', v: Range | undefined): void
    (e: 'change', v: Range | undefined): void
    (e: 'startPicking', v: Range | undefined): void
    (e: 'picking', v: Range | undefined): void
    (e: 'endPicking', v: Range | undefined): void
}>()

// Input State
// -----------------------------------------------------------------------------

const leftInput = reactive({
    value: undefined as Date | undefined,
    outputValue: undefined as Date | undefined,
    focused: false,
    warned: false,
    setValue(value: Date | undefined) {
        leftInput.value = value
        leftInput.outputValue =
            value && rightInput.outputValue
                ? clampTime(value, rightInput.outputValue, 'floor', false)
                : value
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
            value && leftInput.outputValue
                ? clampTime(value, leftInput.outputValue, 'floor', false)
                : value
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

// Slider State
// -----------------------------------------------------------------------------

type SliderState = 'WAIT' | 'LEFT_PICKING' | 'LEFT_PICKED' | 'RIGHT_PICKING'
type SliderAction = 'picking' | 'picked'

const sliderContainer: HTMLElement = $ref()

const slider = reactive({
    dates: computed(() => eachDayOfInterval({ start: min, end: max })),
    state: 'WAIT' as SliderState,
    range: [undefined, undefined] as Range,
    hintTime: undefined as Date | undefined,
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
            // 用户在 sliders 面板上按下鼠标：
            picking(time: Date | undefined) {
                const clampedTime = clampTime(time, undefined, 'near', true)
                if (
                    slider.setRangePoint('left', clampedTime) &&
                    slider.setRangePoint('right', clampedTime)
                ) {
                    emitStartPicking(slider.range)
                    emitPicking(slider.range)
                    slider.syncToInput()
                    slider.activate()
                    slider.hintTime = clampedTime
                    return 'LEFT_PICKING'
                }
            },

            picked() {
                // 有时用户会在其它地方按下鼠标，并在 SliderBar 组件上释放，此时会触发 picked 事件，这种情况直接忽略即可。
            },
        },

        LEFT_PICKING: {
            // 用户按下鼠标的同时移动鼠标：
            picking(time: Date | undefined) {
                const clampedTime = clampTime(time, undefined, 'near', false)
                if (
                    slider.setRangePoint('left', clampedTime) &&
                    slider.setRangePoint('right', clampedTime)
                ) {
                    emitPicking(slider.range)
                    slider.syncToInput()
                    slider.hintTime = clampedTime
                }
            },

            // 用户松开鼠标：
            picked() {
                if (isFullRange(slider.range)) {
                    return 'LEFT_PICKED'
                }
            },
        },

        LEFT_PICKED: {
            // 用户选中左时间点后，按下或直接移动鼠标：
            picking(time: Date | undefined) {
                const clampedTime = clampTime(time, slider.left!, 'near', true)
                if (slider.setRangePoint('right', clampedTime)) {
                    emitPicking(slider.range)
                    slider.syncToInput()
                    slider.hintTime = clampedTime
                    return 'RIGHT_PICKING'
                }
            },

            picked() {
                // 有时用户会在其它地方按下鼠标，并在 SliderBar 组件上释放，此时会触发 picked 事件，这种情况直接忽略即可。
            },
        },

        RIGHT_PICKING: {
            // 用户继续移动鼠标（无论此时鼠标是否被按下）：
            picking(time: Date | undefined, event: MouseEvent) {
                const clampedTime = clampTime(time, slider.left!, 'near', !detectLeftButton(event))
                if (slider.setRangePoint('right', clampedTime)) {
                    emitPicking(slider.range)
                    slider.syncToInput()
                    slider.hintTime = clampedTime
                }
            },

            // 用户松开鼠标：
            picked() {
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
            [action in SliderAction]: (
                time: Date | undefined,
                event: MouseEvent,
            ) => SliderState | void
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
    onPicking(time: Date | undefined, event: MouseEvent) {
        slider.dispatch('picking', time, event)
    },

    onPicked(time: Date | undefined, event: MouseEvent) {
        slider.dispatch('picked', time, event)
    },

    onListMouseMove(event: MouseEvent) {
        if (slider.activated) {
            return
        }

        slider.updateItemSize((event.currentTarget as Element).children[0])

        const time = slider.getTimeByMouseEvent(event)
        slider.hintTime = clampTime(time, undefined, 'near', true)
    },

    onListMouseLeave() {
        if (slider.activated) {
            return
        }

        slider.hintTime = undefined
    },

    onItemMouseDown(event: MouseEvent) {
        // NOTE:
        // 这里当 slider 为 activated 状态时，若其 state 依然为 LEFT_PICKED，则仍然触发 picking 事件，
        // 这是因为当处于 LEFT_PICKED 状态时，只有通过触发 picking 事件才会切换到 RIGHT_PICKING 状态，
        // 而若不作该处理，那么将只会在 onDocumentMouseMove 触发时才会触发 picking 事件，
        // 如此一来，用户将无法通过连点两次以便仅选中一个 step 长度（秒/分钟/小时）的时间区间时，
        // 我认为这对用户体验将是一个极大的损失。
        if (slider.activated && slider.state !== 'LEFT_PICKED') {
            return
        }

        slider.updateItemSize(event.currentTarget as Element)
        slider.onPicking(slider.getTimeByMouseEvent(event), event)
    },

    onDocumentMouseMove(event: MouseEvent) {
        slider.onPicking(slider.getTimeByMouseEvent(event), event)
    },

    onDocumentMouseUp(event: MouseEvent) {
        slider.onPicked(slider.getTimeByMouseEvent(event), event)
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

    updateItemSize(itemEl: Element) {
        const itemRect = itemEl.getBoundingClientRect()

        slider.itemWidth = itemRect.width
        slider.itemHeight = itemRect.height
    },

    dispatch(action: SliderAction, time: Date | undefined, event: MouseEvent) {
        slider.state =
            slider.ACTION_HANDLERS[slider.state as SliderState][action](time, event) ?? slider.state
    },
})

// 与外部进行状态同步
// -----------------------------------------------------------------------------

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

// Tools
// -----------------------------------------------------------------------------

function clampTime(
    time: Date | undefined,
    reference: Date | undefined,
    roundMode: 'floor' | 'near',
    snap: boolean,
) {
    if (!isValidTime(time)) {
        return undefined
    }

    if (snap) {
        time = snapTime(time)
    }

    time = roundTime(time, roundMode)
    reference = step.floor(reference)

    let start: Date = min
    let end: Date = max

    if (reference && limit) {
        start = maxDate([start, subMilliseconds(step.next(reference), limit)])
        end = minDate([end, addMilliseconds(step.prev(reference), limit)])

        if (start.valueOf() > end.valueOf()) {
            return undefined
        }
    }

    return _clampTime(time, start, end)
}

function roundTime(time: Date, mode: 'floor' | 'near') {
    switch (mode) {
        case 'floor':
            return step.floor(time)
        case 'near': {
            const th = 0.9
            const len = step.ms
            const tv = time.valueOf()
            const sv = step.floor(time).valueOf()
            const nv = sv + len
            return new Date((tv - sv) / len < th || !isSameDay(tv, nv) ? sv : nv)
        }
    }
}

/** 以 5 分钟为单位，将时间就近取整 */
function snapTime(time: Date) {
    const th = 0.5
    const len = 1000 * 60 * 15
    const tv = time.valueOf()
    const sv = tv - (tv % len)
    const nv = sv + len
    return new Date((tv - sv) / len < th ? sv : isSameDay(tv, nv) ? nv : nv - 1)
}

function dayPositionToTime(startTimeOfDay: Date, position: number): Date {
    return new Date(
        Math.min(
            startTimeOfDay.valueOf() + Math.round(position * D_MS),
            endOfDay(startTimeOfDay).valueOf(),
        ),
    )
}
</script>
