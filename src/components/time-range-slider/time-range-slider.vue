<template>
    <div class="time-range-slider">
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
            <div
                class="time-range-slider__sliders-container"
                ref="sliderContainer"
                :data-state="slider.state"
            >
                <div
                    ref="sliderList"
                    @pointermove="slider.onListPointerMove"
                    @pointerleave="slider.onListPointerLeave"
                >
                    <SliderBar
                        v-for="item of sliderItems"
                        :key="item.date.valueOf()"
                        :date="item.date"
                        :min="min"
                        :max="max"
                        :step="stepKey"
                        :timeRange="item.range"
                        :hintTimes="item.hintTimes"
                        :hintTimeLines="item.hintTimeLines"
                        @pointerdown="slider.onItemPointerDown"
                    />
                </div>
            </div>
            <div
                v-if="slider.activated && slider.scrollBarWidth"
                class="time-range-slider__main__scrollbar-cover"
                :style="{ width: slider.scrollBarWidth + 'px' }"
            />
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
    differenceInDays,
    differenceInMilliseconds,
} from 'date-fns'
import { computed, markRaw, nextTick, reactive, toRaw, watch } from 'vue'
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
    calcDistance,
    PointFixedSide,
    getStartPoint,
    getEndPoint,
} from './util'
import { useGlobalCursorModifier } from './use-global-cursor-modifier'
import { useHintTimes } from './use-hint-times'
import SliderBar from './slider-bar.vue'
import DateTimeInput from './date-time-input.vue'

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
    (e: 'update:modelValue', v: [Date, Date] | []): void
    (e: 'change', v: [Date, Date] | []): void
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
        rightInput.outputValue = leftInput.outputValue
            ? clampTime(rightInput.value, leftInput.outputValue, 'floor')
            : undefined
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
        leftInput.outputValue = rightInput.outputValue
            ? clampTime(leftInput.value, rightInput.outputValue, 'floor')
            : undefined
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

type SliderState =
    | 'WAIT'
    | 'LEFT_PICKING'
    | 'LEFT_PICKED'
    | 'RIGHT_PICKING'
    | 'LEFT_MOVING'
    | 'RIGHT_MOVING'
    | 'MOVING'

type SliderAction = 'picking' | 'picked'

const sliderContainer: HTMLElement = $ref()
const sliderList: HTMLElement = $ref()

const globalCursorModifier = useGlobalCursorModifier()

const slider = reactive({
    dates: computed(() => eachDayOfInterval({ start: min, end: max })),
    state: 'WAIT' as SliderState,
    range: [undefined, undefined] as Range,

    hintTimes: useHintTimes(),

    /** 表示用户当前正在与 sliders 面板进行交互 */
    activated: false,

    itemWidth: 0,
    itemHeight: 0,

    scrollBarWidth: 0,

    snapMode: SnapMode.Large,
    granularity: Granularity.FiveMinutes,

    initialClientX: 0,
    initialClientY: 0,
    initialTime: undefined as Date | undefined,
    isMoving: false,
    isDoubleClick: false,
    pointerEventQueue: markRaw([]) as {
        clientX: number
        clientY: number
        timeStamp: number
        type: 'down' | 'up'
    }[],

    scrollActionId: 0,

    movingInitialRange: [undefined, undefined] as Range,

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
                slider.hintTimes.line = true
                globalCursorModifier.reset()
            },

            leave() {
                slider.activate()
                slider.hintTimes.line = false
                slider.updateScrollBarWidth()
            },

            // 用户在 sliders 面板上按下鼠标：
            picking(time: Date | undefined, event: PointerEvent) {
                const mover = isMoverElement(event.target)
                const resizer = isResizerElement(event.target)

                if (mover) {
                    emitStartPicking(slider.range)
                    return 'MOVING'
                } else if (resizer) {
                    emitStartPicking(slider.range)

                    switch (resizer) {
                        case 'left':
                            slider.hintTimes.set(slider.left)
                            return 'LEFT_MOVING'
                        case 'right':
                            slider.hintTimes.set(slider.right)
                            return 'RIGHT_MOVING'
                        default:
                            throw new Error('invalid resizer')
                    }
                } else {
                    const clampedTime = clampTime(time, undefined, 'near')

                    if (
                        slider.setRangePoint('left', clampedTime) &&
                        slider.setRangePoint('right', clampedTime)
                    ) {
                        slider.syncToInput()
                        slider.hintTimes.set(clampedTime)
                        emitStartPicking(slider.range)
                        emitPicking(slider.range)
                        return 'LEFT_PICKING'
                    }
                }
            },

            picked() {
                // 有时用户会在其它地方按下鼠标，并在 SliderBar 组件上释放，此时会触发 picked 事件，这种情况直接忽略即可。
            },
        },

        LEFT_PICKING: {
            enter() {
                slider.snapMode = SnapMode.None
                globalCursorModifier.set('text')
            },

            // 用户按下鼠标的同时移动鼠标：
            picking(time: Date | undefined) {
                const clampedTime = clampTime(time, undefined, 'near')
                if (
                    slider.setRangePoint('left', clampedTime) &&
                    slider.setRangePoint('right', clampedTime)
                ) {
                    slider.syncToInput()
                    slider.hintTimes.set(clampedTime)
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
            picking(time: Date | undefined, event: PointerEvent) {
                const clampedTime = clampTime(time, slider.left!, 'near')
                if (slider.setRangePoint('right', clampedTime)) {
                    slider.syncToInput()
                    slider.hintTimes.set(clampedTime)
                    emitPicking(slider.range)
                    if (event.type === 'pointerdown') {
                        return 'RIGHT_PICKING'
                    }
                }
            },

            picked() {
                // 无需处理
            },
        },

        RIGHT_PICKING: {
            enter() {
                slider.snapMode = SnapMode.None
            },

            // 用户按下鼠标后继续移动：
            picking(time: Date | undefined, event: PointerEvent) {
                const clampedTime = clampTime(time, slider.left!, 'near')
                if (slider.setRangePoint('right', clampedTime)) {
                    slider.syncToInput()
                    slider.hintTimes.set(clampedTime)
                    emitPicking(slider.range)
                }
            },

            // 用户松开鼠标（DONE）：
            picked() {
                // 判断是否是双击
                if (slider.isDoubleClick) {
                    slider.onDoubleClick()
                }

                emitEndPicking(slider.range)
                emitChange(slider.range as Range) // WAIT
                return 'WAIT'
            },
        },

        LEFT_MOVING: {
            enter() {
                globalCursorModifier.set('ew-resize')
            },

            // 用户按下鼠标后继续移动：
            picking(time: Date | undefined) {
                const clampedTime = clampTime(time, slider.right!, 'near')
                if (slider.setRangePoint('left', clampedTime)) {
                    slider.syncToInput()
                    slider.hintTimes.set(clampedTime)
                    emitPicking(slider.range)
                }
            },

            // 用户松开鼠标（DONE）：
            picked() {
                // 判断是否是双击
                if (slider.isDoubleClick) {
                    slider.onDoubleClick()
                }

                emitEndPicking(slider.range)
                emitChange(slider.range as Range) // WAIT
                return 'WAIT'
            },
        },

        RIGHT_MOVING: {
            enter() {
                globalCursorModifier.set('ew-resize')
            },

            // 用户按下鼠标后继续移动：
            picking(time: Date | undefined) {
                const clampedTime = clampTime(time, slider.left!, 'near')
                if (slider.setRangePoint('right', clampedTime)) {
                    slider.syncToInput()
                    slider.hintTimes.set(clampedTime)
                    emitPicking(slider.range)
                }
            },

            // 用户松开鼠标（DONE）：
            picked() {
                // 判断是否是双击
                if (slider.isDoubleClick) {
                    slider.onDoubleClick()
                }

                emitEndPicking(slider.range)
                emitChange(slider.range as Range) // WAIT
                return 'WAIT'
            },
        },

        MOVING: {
            enter() {
                slider.snapMode = SnapMode.None

                assert(isFullRange(slider.range), `slider.range isn't a full range`)
                assert(isValidTime(slider.initialTime), `slider.initialTime isn't a valid time`)

                const left = clampTime(slider.range[0], undefined, 'floor')
                const right = clampTime(slider.range[1], left, 'floor')
                slider.movingInitialRange = [left, right]

                globalCursorModifier.set('grabbing')
            },

            leave() {
                slider.movingInitialRange = [undefined, undefined]
            },

            picking(time: Date | undefined) {
                assert(isValidTime(time), `picking time isn't a valid time`)
                const initialTime = slider.initialTime!

                const initialStartPoint = getStartPoint(slider.movingInitialRange)
                const initialEndPoint = getEndPoint(slider.movingInitialRange)

                const initialStartTime = initialStartPoint.time!
                const initialEndTime = initialEndPoint.time!

                const date = startOfDay(time)
                const initialDate = startOfDay(initialTime)

                const timeOfDay = differenceInMilliseconds(time, date)
                const initialTimeOfDay = differenceInMilliseconds(initialTime, initialDate)

                const initialStartTimeOfDay = differenceInMilliseconds(
                    initialStartTime,
                    startOfDay(initialStartTime),
                )
                const initialEndTimeOfDay = differenceInMilliseconds(
                    initialEndTime,
                    startOfDay(initialEndTime),
                )

                const dateDiff = differenceInMilliseconds(date, initialDate)
                const timeDiff = clamp(
                    timeOfDay - initialTimeOfDay,
                    -initialStartTimeOfDay,
                    D_MS - 1 - initialEndTimeOfDay,
                )
                const offset = clamp(
                    dateDiff + timeDiff,
                    differenceInMilliseconds(min, initialStartTime),
                    differenceInMilliseconds(max, initialEndTime),
                )

                const startTime = clampTime(
                    addMilliseconds(initialStartTime, offset),
                    undefined,
                    'floor',
                )
                const endTime = clampTime(
                    addMilliseconds(initialEndTime, offset),
                    startTime,
                    'floor',
                )

                const range =
                    initialStartPoint.side === 'left' ? [startTime, endTime] : [endTime, startTime]

                slider.setRange(range)
                slider.hintTimes.set(...range)
                slider.syncToInput()
                emitPicking(slider.range)
            },

            picked() {
                // 判断是否是双击
                if (slider.isDoubleClick) {
                    slider.onDoubleClick()
                }

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
                event: PointerEvent,
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

    setRangePoint(point: PointFixedSide, time: Date | undefined) {
        if (!isValidTime(time)) {
            return false
        }

        slider.range[point === 'left' ? 0 : 1] = time

        return true
    },

    syncToInput() {
        resetInputValue(normalizeRange(slider.range))
    },

    onDoubleClick() {
        const time = slider.left

        if (isValidTime(time)) {
            const startTime = clampTime(startOfDay(time), undefined, 'floor')
            const endTime = clampTime(endOfDay(time), startTime, 'floor')

            if (slider.setRangePoint('left', startTime) && slider.setRangePoint('right', endTime)) {
                slider.syncToInput()
            }
        }
    },

    // 必须确保在触发 picking 或 picked 事件时，time 不能是 undefined
    // 若有 clean 操作，那么应当是一个额外的事件
    onPicking(time: Date | undefined, event: PointerEvent) {
        slider.dispatch('picking', time, event)
    },

    onPicked(time: Date | undefined, event: PointerEvent) {
        slider.dispatch('picked', time, event)
    },

    onListPointerMove(event: PointerEvent) {
        if (slider.activated) {
            return
        }

        slider.updateItemSize((event.currentTarget as Element).children[0])

        const mover = isMoverElement(event.target)
        const resizer = isResizerElement(event.target)

        if (mover) {
            slider.hintTimes.set(undefined)
        } else if (resizer) {
            slider.hintTimes.set(resizer === 'left' ? slider.left : slider.right)
        } else {
            const time = slider.getTimeByPointerEvent(event)
            slider.hintTimes.set(clampTime(time, undefined, 'near'))
        }
    },

    onListPointerLeave() {
        if (slider.activated) {
            return
        }

        slider.hintTimes.set(undefined)
    },

    onItemPointerDown(event: PointerEvent) {
        if (slider.activated) {
            return
        }

        slider.updateItemSize(event.currentTarget as Element)
        slider.onPointerDown(event)
        slider.onPicking(slider.getTimeByPointerEvent(event), event)
    },

    onDocumentPointerMove(event: PointerEvent) {
        slider.onPointerMove(event)
        if (slider.isMoving || event.shiftKey) {
            slider.onPicking(slider.getTimeByPointerEvent(event), event)
        }
    },

    onDocumentPointerDown(event: PointerEvent) {
        slider.onPointerDown(event)
        slider.onPicking(slider.getTimeByPointerEvent(event), event)
    },

    onDocumentPointerUp(event: PointerEvent) {
        slider.onPointerUp(event)
        slider.onPicked(slider.getTimeByPointerEvent(event), event)
    },

    activate() {
        slider.activated = true
        document.addEventListener('pointermove', slider.onDocumentPointerMove, false)
        document.addEventListener('pointerup', slider.onDocumentPointerUp, false)
        // NOTE
        // 这里使用 setTimeout 是因为该 activate 方法是因为用户点击面板项而被调用的，此时若在 document 绑定
        // 点击事件，那么 onDocumentPointerDown 回调将会立即触发（因为冒泡），这将会导致连续触发两次 picking，
        // 为了避免这种情况，因此才加了一点延迟。
        setTimeout(() => {
            document.addEventListener('pointerdown', slider.onDocumentPointerDown, false)
        })
    },

    inactivate() {
        document.removeEventListener('pointermove', slider.onDocumentPointerMove, false)
        document.removeEventListener('pointerdown', slider.onDocumentPointerDown, false)
        document.removeEventListener('pointerup', slider.onDocumentPointerUp, false)

        // NOTE
        // 这里使用 nextTick 的原因是，当 slider 面板切换到 inactivate 状态时通常会触发 update:modelValue 事件，
        // 若用户在这个过程中调整了 modelValue，那么会导致组件内接收到的值与 slider.range 不一致，
        // 进而这会触发 slider 的自动滚动，但我们可能并不想这样做，因此通过延迟关闭 activated
        // 状态来避免这种情况的出现。
        nextTick(() => {
            slider.activated = false
        })
    },

    onPointerDown(event: PointerEvent) {
        slider.initialClientX = event.clientX
        slider.initialClientY = event.clientY
        slider.initialTime = slider.getTimeByPointerEvent(event)
        slider.isMoving = false
        slider.pushPointerEvent(event, 'down')
    },

    onPointerUp(event: PointerEvent) {
        slider.initialClientX = 0
        slider.initialClientY = 0
        slider.initialTime = undefined
        slider.isMoving = false
        slider.pushPointerEvent(event, 'up')
        slider.checkIsDoubleClick()
    },

    onPointerMove(event: PointerEvent) {
        if (!slider.isMoving) {
            const moveDistance = calcDistance(
                slider.initialClientX,
                slider.initialClientY,
                event.clientX,
                event.clientY,
            )

            if (moveDistance >= 4) {
                slider.isMoving = true
            }
        }
    },

    checkIsDoubleClick() {
        const [a, b, c, d] = slider.pointerEventQueue
        slider.isDoubleClick =
            a?.type === 'down' &&
            b?.type === 'up' &&
            c?.type === 'down' &&
            d?.type === 'up' &&
            d.timeStamp - a.timeStamp < 430 &&
            calcDistance(d.clientX, d.clientY, c.clientX, c.clientY) < 4 &&
            calcDistance(d.clientX, d.clientY, b.clientX, b.clientY) < 4 &&
            calcDistance(d.clientX, d.clientY, a.clientX, a.clientY) < 4
    },

    pushPointerEvent({ clientX, clientY, timeStamp }: PointerEvent, type: 'down' | 'up') {
        slider.pointerEventQueue.push({
            clientX,
            clientY,
            timeStamp,
            type,
        })

        if (slider.pointerEventQueue.length === 5) {
            slider.pointerEventQueue.shift()
        }
    },

    getTimeByPointerEvent({ clientX, clientY, shiftKey }: PointerEvent) {
        if (!sliderContainer) {
            return undefined
        }

        const { itemWidth, itemHeight, dates } = slider

        const containerRect = sliderContainer.getBoundingClientRect()
        const containerY = clamp(Math.round(clientY - containerRect.top), 0, containerRect.height)

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

    ensureItemSize() {
        if (slider.itemWidth === 0 && slider.itemHeight === 0 && sliderList) {
            this.updateItemSize(sliderList.children[0])
        }
    },

    updateItemSize(itemEl: Element) {
        const itemRect = itemEl.getBoundingClientRect()

        slider.itemWidth = itemRect.width
        slider.itemHeight = itemRect.height
    },

    updateScrollBarWidth() {
        if (sliderContainer) {
            slider.scrollBarWidth = sliderContainer.offsetWidth - sliderContainer.clientWidth
        }
    },

    async scrollIntoChangedPointIfNeeded(originalRange: Range, newRange: Range) {
        if (isEmptyRange(newRange)) {
            return
        }

        originalRange = [...originalRange]
        newRange = [...newRange]

        let actionId = ++slider.scrollActionId

        await nextTick()

        if (slider.scrollActionId !== actionId) {
            return
        }

        if (!sliderContainer) {
            return
        }

        this.ensureItemSize()

        const [newStartTime, newEndTime] = normalizeRange(newRange)

        const startItemIndex = differenceInDays(startOfDay(newStartTime!), startOfDay(min))
        const endItemIndex = newEndTime
            ? differenceInDays(startOfDay(newEndTime), startOfDay(min))
            : startItemIndex

        const itemHeight = slider.itemHeight
        const containerHeight = sliderContainer.getBoundingClientRect().height

        let scrollY: number = 0

        const startItemTop = startItemIndex * itemHeight
        const endItemBottom = (endItemIndex + 1) * itemHeight

        if (endItemBottom - startItemTop <= containerHeight) {
            scrollY = startItemTop - (containerHeight - (endItemBottom - startItemTop)) / 2
        } else if (startItemIndex === endItemIndex) {
            scrollY = startItemTop
        } else if (isEmptyRange(originalRange)) {
            scrollY = startItemTop - 10
        } else {
            let movedPoint: 'start' | 'end' | undefined

            if (leftInput.focused && leftInput.outputValue) {
                movedPoint =
                    !rightInput.outputValue || leftInput.outputValue < rightInput.outputValue
                        ? 'start'
                        : 'end'
            } else if (rightInput.focused && rightInput.outputValue) {
                movedPoint =
                    !leftInput.outputValue || rightInput.outputValue < leftInput.outputValue
                        ? 'start'
                        : 'end'
            } else {
                movedPoint = checkMovedPoint(originalRange, newRange)
            }

            if (movedPoint === 'end') {
                scrollY = endItemBottom - containerHeight + 10
            } else {
                scrollY = startItemTop - 10
            }
        }

        const behavior = isEmptyRange(originalRange) && isFullRange(newRange) ? 'none' : 'auto'

        // scroll
        if (behavior == 'none') {
            sliderContainer.style.setProperty('scroll-behavior', 'auto')

            nextTick(() => {
                sliderContainer?.style.removeProperty('scroll-behavior')
            })
        }

        sliderContainer.scrollTo(0, scrollY)
    },

    dispatch(action: SliderAction, time: Date | undefined, event: PointerEvent) {
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
    const { range, hintTimes } = slider
    const [startPoint, endPoint] = normalizeRange(range)

    const dateOfStartPoint = startPoint ? startOfDay(startPoint).valueOf() : undefined
    const dateOfEndPoint = endPoint ? startOfDay(endPoint).valueOf() : dateOfStartPoint

    return dates.map((date) => {
        const dateValue = date.valueOf()

        const passRange = dateValue >= dateOfStartPoint! && dateValue <= dateOfEndPoint!
        const hintTimesByDay = hintTimes.getTimesByDay(dateValue)

        return {
            date,
            range: passRange ? range : EMPTY_RANGE,
            hintTimes: hintTimesByDay,
            hintTimeLines: hintTimesByDay ? hintTimes.line : false,
        }
    })
})

// watchEffect(() => {
//     console.info('slider status:', slider.state)
// })

// 与外部进行状态同步
// -----------------------------------------------------------------------------

// 同步外部状态的改变。
// 但当用户正在 slider 面板中选取时间时，则等到选取操作结束之后再进行同步。
// NOTE: 若是由于用户在组件内选取或输入时间而导致的 modelValue 改变（即在 update:modelValue 事件触发时，同步修改并使用事件所传入的参数值），
//       那么 sliderActivated 和 inputFocused 状态会在 modelValue 属性更新之后再切换为 false，
//       这一点确保了 slider 和 input 不会因为 watch 重复触发而被强制设置值。
//       （若这一点无法保证，那么 sliderActivated 状态切换时会触发一次 watch，
//          此时由于 modelValue 没有改变，
//          slider 和 input 中的时间区间肯定不会和 modelValue 一样，
//          所以它们会被强行设置为 modelValue，
//          紧接着 modelValue 改变又一次触发 watch，
//          slider 和 input 会再被设置为新的 modelValue 的值）
watch(
    [$$(modelValue), computed(() => slider.activated)],
    ([modelValue, sliderActivated]) => {
        if (!sliderActivated) {
            modelValueToSlideRange()
            modelValueToInputRange()
        }
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
    const outputRange = isFullRange(range) ? (normalizeRange(range) as [Date, Date]) : ([] as [])
    emit('update:modelValue', outputRange)
    emit('change', outputRange)
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

function isResizerElement(el: HTMLElement | EventTarget | null): PointFixedSide | undefined {
    if (el instanceof HTMLElement) {
        return el.dataset.resizer as PointFixedSide | undefined
    }
}

function isMoverElement(el: HTMLElement | EventTarget | null): boolean {
    if (el instanceof HTMLElement) {
        return el.dataset.mover === 'true'
    }

    return false
}
</script>
