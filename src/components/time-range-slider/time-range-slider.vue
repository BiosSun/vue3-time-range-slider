<template>
    <div class="time-range-slider" style="width: 600px; margin: 30px auto">
        <div class="time-range-slider__header">
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
            <span>-</span>
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
        <div class="time-range-slider__main">
            <div class="time-range-slider__sliders-container" ref="sliderContainer">
                <div @mousemove="slider.onListMouseMove" @mouseleave="slider.onListMouseLeave">
                    <SliderBar
                        v-for="item of sliderItems"
                        :key="item.date.valueOf()"
                        :date="item.date"
                        :min="min"
                        :max="max"
                        :step="stepKey"
                        :timeRange="item.range"
                        :hintTime="item.hintTime"
                        :hintTimeLine="item.hintTimeLine"
                        @mousedown="slider.onItemMouseDown"
                    />
                </div>
            </div>
        </div>
    </div>
</template>
<script lang="ts" setup>
import {
    eachDayOfInterval,
    endOfDay,
    min as minDate,
    max as maxDate,
    subMilliseconds,
    addMilliseconds,
    isSameDay,
    startOfDay,
} from 'date-fns'
import { computed, nextTick, reactive, toRaw, watch } from 'vue'
import scrollIntoView from 'scroll-into-view-if-needed'
import SliderBar from './slider-bar.vue'
import DateTimeInput from './date-time-input.vue'
import {
    Range,
    isValidTime,
    isValidRange,
    isEmptyRange,
    isFullRange,
    getLeftPoint,
    getRightPoint,
    clamp,
    clampIndex,
    clampTime as _clampTime,
    assert,
    SliderStep,
    D_MS,
    STEP_INFOS,
    checkMovedPoint,
    normalizeRange,
    isSameRange,
    ensureSameDirection,
    getRangeDuration,
    StepInfo,
    EMPTY_RANGE,
} from './util'

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
        leftInput.outputValue = clampTime(value, undefined, 'floor')
        rightInput.outputValue = clampTime(rightInput.value, leftInput.outputValue, 'floor')
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
        rightInput.outputValue = clampTime(value, undefined, 'floor')
        leftInput.outputValue = clampTime(leftInput.value, rightInput.outputValue, 'floor')
    },
    onChange(value: Date | undefined) {
        rightInput.setValue(value)
        emitChange([leftInput.outputValue, rightInput.outputValue])
    },
})

const inputWarned = $computed(() => {
    if (!limit) {
        return false
    }

    if (!leftInput.value || !rightInput.value) {
        return false
    }

    const duration = getRangeDuration([leftInput.value, rightInput.value], step)
    return duration > limit
})

const inputFocused = $computed(() => leftInput.focused || rightInput.focused)

function resetInputValue(range: Range) {
    leftInput.value = leftInput.outputValue = range[0]
    rightInput.value = rightInput.outputValue = range[1]
}

// Slider State
// -----------------------------------------------------------------------------

/** 吸附模式 */
enum SnapMode {
    None = 0,
    Large = 1,
    Small = 2,
}

/** 每个整点所属的吸附分组 */
// prettier-ignore
const SNAP_GROUPS: {[key: number]: 0 | 1 | 2 | 3} = {
     0: 0, 24: 0,
    12: 1,
     3: 2,  6: 2,  9: 2, 15: 2, 18: 2, 21: 2,
     1: 3,  2: 3,  4: 3,  5: 3,  7: 3,  8: 3, 10: 3, 11: 3, 13: 3, 14: 3, 16: 3, 17: 3, 19: 3, 20: 3, 22: 3, 23: 3,
};

/** 每种吸附模式下，每个分组的吸附触发距离 */
const SNAP_MODE_INFOS = {
    [SnapMode.Large]: [8, 6, 4, 4],
    [SnapMode.Small]: [2, 1, 1, 1],
}

/** 按所指定的吸附模式，控制 x 轴坐标 */
function snap(x: number, l: number, snapMode: SnapMode) {
    if (!snapMode) {
        return x
    }

    const i = l / 24 // 每个小时的长度
    const h = Math.round(x / i) // 最近的小时数
    const c = h * i // 该小时数的位置
    const g = SNAP_GROUPS[h] // 所属分组
    const o = SNAP_MODE_INFOS[snapMode][g] // 吸附距离

    return x >= c - o && x <= c + o ? c : x
}

/** 时间粒度 */
enum Granularity {
    None = 0,
    OneMinute = 1000 * 60,
    FiveMinutes = 1000 * 60 * 5,
}

/** 按所指定的时间粒度，将时间就近取整 */
function roundTimeByGranularity(time: Date, granularity: Granularity) {
    if (!granularity) {
        return time
    }

    const th = 0.5
    const len = granularity
    const tv = time.valueOf()
    const sv = tv - (tv % len)
    const nv = sv + len
    return new Date((tv - sv) / len < th ? sv : isSameDay(tv, nv) ? nv : nv - 1)
}

type SliderState = 'WAIT' | 'LEFT_PICKING' | 'LEFT_PICKED' | 'RIGHT_PICKING'
type SliderAction = 'picking' | 'picked'

const sliderContainer: HTMLElement = $ref()

const slider = reactive({
    dates: computed(() => eachDayOfInterval({ start: min, end: max })),
    state: 'WAIT' as SliderState,
    range: [undefined, undefined] as Range,
    hintTime: undefined as Date | undefined,
    hintTimeLine: true,

    /** 表示用户当前正在与 sliders 面板进行交互 */
    activated: false,

    itemWidth: 0,
    itemHeight: 0,

    snapMode: SnapMode.Large,
    granularity: Granularity.FiveMinutes,

    initialClientX: 0,
    initialClientY: 0,
    isMoving: false,

    scrollActionId: 0,

    get left(): Date | undefined {
        return slider.range[0]
    },

    get right(): Date | undefined {
        return slider.range[1]
    },

    // 一个简单的状态机，处理与选择时间区间操作相关的所有交互逻辑
    ACTION_HANDLERS: {
        WAIT: {
            enter() {
                slider.inactivate()
                slider.snapMode = SnapMode.Large
                slider.hintTimeLine = true
            },

            leave() {
                slider.activate()
                slider.hintTimeLine = false
            },

            // 用户在 sliders 面板上按下鼠标：
            picking(time: Date | undefined) {
                const clampedTime = clampTime(time, undefined, 'near')
                if (
                    slider.setRangePoint('left', clampedTime) &&
                    slider.setRangePoint('right', clampedTime)
                ) {
                    slider.syncToInput()
                    slider.hintTime = clampedTime
                    emitStartPicking(slider.range)
                    emitPicking(slider.range)
                    return 'LEFT_PICKING'
                }
            },

            picked() {
                // 有时用户会在其它地方按下鼠标，并在 SliderBar 组件上释放，此时会触发 picked 事件，这种情况直接忽略即可。
            },
        },

        LEFT_PICKING: {
            enter() {
                slider.snapMode = SnapMode.None
            },

            // 用户按下鼠标的同时移动鼠标：
            picking(time: Date | undefined) {
                const clampedTime = clampTime(time, undefined, 'near')
                if (
                    slider.setRangePoint('left', clampedTime) &&
                    slider.setRangePoint('right', clampedTime)
                ) {
                    slider.syncToInput()
                    slider.hintTime = clampedTime
                    emitPicking(slider.range)
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
            enter() {
                slider.snapMode = SnapMode.Large
            },

            // 用户选中左时间点后，移动或按下鼠标：
            picking(time: Date | undefined, event: MouseEvent) {
                const clampedTime = clampTime(time, slider.left!, 'near')
                if (slider.setRangePoint('right', clampedTime)) {
                    slider.syncToInput()
                    slider.hintTime = clampedTime
                    emitPicking(slider.range)
                    if (event.type === 'mousedown') {
                        return 'RIGHT_PICKING'
                    }
                }
            },

            // 用户松开鼠标（DONE）：
            picked() {
                emitEndPicking(slider.range)
                emitChange(slider.range as Range) // WAIT
                return 'WAIT'
            },
        },

        RIGHT_PICKING: {
            enter() {
                slider.snapMode = SnapMode.None
            },

            // 用户按下鼠标后继续移动：
            picking(time: Date | undefined, event: MouseEvent) {
                const clampedTime = clampTime(time, slider.left!, 'near')
                if (slider.setRangePoint('right', clampedTime)) {
                    slider.syncToInput()
                    slider.hintTime = clampedTime
                    emitPicking(slider.range)
                }
            },

            // 用户松开鼠标（DONE）：
            picked() {
                emitEndPicking(slider.range)
                emitChange(slider.range as Range) // WAIT
                return 'WAIT'
            },
        },
    } as {
        [state in SliderState]: {
            enter?: () => void
            leave?: () => void
        } & {
            [action in SliderAction]: (
                time: Date | undefined,
                event: MouseEvent,
            ) => SliderState | void
        }
    },

    setRange(range: Range) {
        if (!isValidRange(range)) {
            return false
        }

        const originalRange = slider.range
        const newRange = [...range]

        slider.range = newRange

        if (!slider.activated) {
            slider.scrollIntoChangedPointIfNeeded(originalRange, newRange)
        }

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
        resetInputValue(slider.range)
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
        slider.hintTime = clampTime(time, undefined, 'near')
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

        slider.initialClientX = event.clientX
        slider.initialClientY = event.clientY
        slider.isMoving = false

        slider.updateItemSize(event.currentTarget as Element)
        slider.onPicking(slider.getTimeByMouseEvent(event), event)
    },

    onDocumentMouseMove(event: MouseEvent) {
        if (!slider.isMoving) {
            const moveDistance = Math.sqrt(
                Math.abs(slider.initialClientX - event.clientX) ** 2 +
                    Math.abs(slider.initialClientY - event.clientY) ** 2,
            )

            if (moveDistance < 4) {
                return
            }

            slider.isMoving = true
        }

        slider.onPicking(slider.getTimeByMouseEvent(event), event)
    },

    onDocumentMouseUp(event: MouseEvent) {
        slider.initialClientX = 0
        slider.initialClientY = 0
        slider.isMoving = false

        slider.onPicked(slider.getTimeByMouseEvent(event), event)
    },

    activate() {
        slider.activated = true
        document.addEventListener('mousemove', slider.onDocumentMouseMove, false)
        document.addEventListener('mouseup', slider.onDocumentMouseUp, false)
    },

    inactivate() {
        document.removeEventListener('mousemove', slider.onDocumentMouseMove, false)
        document.removeEventListener('mouseup', slider.onDocumentMouseUp, false)

        // NOTE
        // 这里使用 nextTick 的原因是，当 slider 面板切换到 inactivate 状态时通常会触发 update:modelValue 事件，
        // 若用户在这个过程中调整了 modelValue，那么会导致组件内接收到的值与 slider.range 不一致，
        // 进而这会触发 slider 的自动滚动，但我们可能并不想这样做，因此通过延迟关闭 activated
        // 状态来避免这种情况的出现。
        nextTick(() => {
            slider.activated = false
        })
    },

    getTimeByMouseEvent({ clientX, clientY, shiftKey }: MouseEvent) {
        const { itemWidth, itemHeight, dates } = slider

        const containerRect = sliderContainer.getBoundingClientRect()
        const containerY = clamp(clientY - containerRect.top, 0, containerRect.height)

        const itemIndex = clampIndex((containerY + sliderContainer.scrollTop) / itemHeight, dates.length) // prettier-ignore
        const itemX = clamp(clientX - containerRect.left, 0, itemWidth)

        let snapMode = slider.snapMode
        let granularity = slider.granularity

        if (shiftKey) {
            if (snapMode !== SnapMode.None) {
                snapMode = SnapMode.Small
            }

            if (granularity !== Granularity.None) {
                granularity = Granularity.None
            }
        }

        return calcTimeByPosition(dates[itemIndex], itemX, itemWidth, granularity, snapMode)
    },

    updateItemSize(itemEl: Element) {
        const itemRect = itemEl.getBoundingClientRect()

        slider.itemWidth = itemRect.width
        slider.itemHeight = itemRect.height
    },

    async scrollIntoChangedPointIfNeeded(originalRange: Range, newRange: Range) {
        let actionId = ++slider.scrollActionId

        await nextTick()

        if (slider.scrollActionId !== actionId) {
            return
        }

        let movedPoint: 'start' | 'end' | undefined
        let behavior: 'none' | 'auto'

        if (isEmptyRange(originalRange) && isFullRange(newRange)) {
            movedPoint = 'start'
            behavior = 'none'
        } else {
            movedPoint = checkMovedPoint(originalRange, newRange)
            behavior = 'auto'
        }

        if (!movedPoint) {
            return
        }

        const pointEl = sliderContainer?.querySelector(`[data-point=${movedPoint}]`)

        if (!pointEl) {
            return
        }

        // scroll
        if (behavior == 'none') {
            sliderContainer!.style.setProperty('scroll-behavior', 'auto')

            nextTick(() => {
                sliderContainer!.style.removeProperty('scroll-behavior')
            })
        }

        scrollIntoView(pointEl, {
            scrollMode: 'if-needed',
            block: 'nearest',
            inline: 'nearest',
        })
    },

    dispatch(action: SliderAction, time: Date | undefined, event: MouseEvent) {
        const nextState = slider.ACTION_HANDLERS[slider.state][action](time, event)
        if (nextState && nextState !== slider.state) {
            slider.ACTION_HANDLERS[slider.state].leave?.()
            slider.state = nextState
            slider.ACTION_HANDLERS[slider.state].enter?.()
        }
    },
})

const sliderItems = $computed(() => {
    const dates = toRaw(slider.dates)
    const range = slider.range
    const [startPoint, endPoint] = normalizeRange(range)
    const hintTime = slider.hintTime
    const hintTimeLine = slider.hintTimeLine

    const dateOfHintTime = hintTime ? startOfDay(hintTime).valueOf() : undefined
    const dateOfStartPoint = startPoint ? startOfDay(startPoint).valueOf() : undefined
    const dateOfEndPoint = endPoint ? startOfDay(endPoint).valueOf() : dateOfStartPoint

    return dates.map((date) => {
        const dateValue = date.valueOf()

        const passRange = dateValue >= dateOfStartPoint! && dateValue <= dateOfEndPoint!
        const passHintTime = dateOfHintTime === dateValue

        return {
            date,
            range: passRange ? range : EMPTY_RANGE,
            hintTime: passHintTime ? hintTime : undefined,
            hintTimeLine: passHintTime ? hintTimeLine : false,
        }
    })
})

// watchEffect(() => {
//     console.info('slider status:', slider.state)
// })

// 与外部进行状态同步
// -----------------------------------------------------------------------------

// NOTE: 若是由于用户在组件内选取或输入时间而导致的 modelValue 改变，那么 sliderActivated 和 inputFocused 状态
//       的改变都是在 modelValue 之后的，这一点确保了 slider 和 input 不会因为 watch 重复触发而被强制设置值。
//       （若这一点无法保证，那么 sliderActivated 或 inputFocused 状态改变时会触发一次 watch，此时由于 modelValue
//         没有改变，slider 和 input 中的时间区间肯定不会和 modelValue 一样，所以它们会被强行设置为 modelValue，
//         紧接着 modelValue 改变又一次触发 watch，slider 和 input 会再被设置为新的 modelValue 的值）
watch(
    [$$(modelValue), computed(() => slider.activated), inputFocused],
    ([modelValue, sliderActivated, inputFocused]) => {
        // 当用户正在 slider 面板中选取时间时，不响应外部的状态改变
        if (sliderActivated) {
            return
        }

        // 当用户正在时间输入框中输入值时，不响应外部的状态改变
        if (inputFocused) {
            return
        }

        modelValueToSlideRange()
        modelValueToInputRange()
    },
    { immediate: true, deep: true },
)

function modelValueToSlideRange() {
    if (!isSameRange(modelValue, slider.range)) {
        slider.setRange(ensureSameDirection(modelValue, slider.range))
    }
}

function modelValueToInputRange() {
    const inputRange = [leftInput.outputValue, rightInput.outputValue] as Range
    if (!isSameRange(modelValue, inputRange)) {
        resetInputValue(ensureSameDirection(modelValue, inputRange))
    }
}

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
    emit('change', normalizeRange(range))
}

// Tools
// -----------------------------------------------------------------------------

function clampTime(
    time: Date | undefined,
    reference: Date | undefined,
    roundMode: 'floor' | 'near',
) {
    if (!isValidTime(time)) {
        return undefined
    }

    time = roundTimeByStep(time, step, roundMode)
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

function roundTimeByStep(time: Date, step: StepInfo, mode: 'floor' | 'near') {
    switch (mode) {
        case 'floor':
            return step.floor(time)
        case 'near': {
            // WAIT 这个 0.9 需要再确认一下
            const th = 0.9
            const len = step.ms
            const tv = time.valueOf()
            const sv = step.floor(time).valueOf()
            const nv = sv + len
            return new Date((tv - sv) / len < th || !isSameDay(tv, nv) ? sv : nv)
        }
    }
}

function calcTimeByPosition(
    startTimeOfDay: Date,
    x: number,
    l: number,
    granularity: Granularity,
    snapMode: SnapMode,
) {
    x = snap(x, l, snapMode)

    let time = new Date(
        Math.min(
            startTimeOfDay.valueOf() + Math.round((x / l) * D_MS),
            endOfDay(startTimeOfDay).valueOf(),
        ),
    )

    time = roundTimeByGranularity(time, granularity)

    return time
}
</script>
