<template>
    <div
        class="time-range-slider__inputs"
        :class="{ 'time-range-slider__inputs--warned': warned }"
    >
        <input
            class="time-range-slider__input time-range-slider__date-input"
            ref="dateInput"
            type="date"
            :value="inputDateString"
            :min="minDateString"
            :max="maxDateString"
            @change="onDateChange"
            @focus="onFocus"
            @blur="onBlur"
        />
        <input
            :key="step.s"
            class="time-range-slider__input time-range-slider__time-input"
            :class="{ 'time-range-slider__input--invalid': invalidTime }"
            ref="timeInput"
            type="time"
            :step="step.s"
            :value="inputTimeString"
            @change="onTimeChange"
            @focus="onFocus"
            @blur="onBlur"
        />
    </div>
</template>
<script lang="ts" setup>
import { format, parse, isValid } from 'date-fns'
import { watch } from 'vue'
import useIsFocused from './use-is-focused'
import { clampTime, isSameTime, mergeDateAndTime, SliderStep, STEP_INFOS } from './util'

const {
    modelValue,
    min,
    max,
    warned,
    step: stepKey,
} = defineProps<{
    modelValue?: Date
    // 这里的 min 和 max 是已经根据 step 进行 floor 处理后的
    min: Date
    max: Date
    warned?: boolean
    step: SliderStep
}>()

const emit = defineEmits<{
    /** 用户在输入框中输入了一个新的值，或清除值 */
    (e: 'update:modelValue', value: Date | undefined): void

    /** 输入框获取到焦点 */
    (e: 'focus'): void

    /** 输入框失去焦点 */
    (e: 'blur'): void
}>()

const { isFocused, onFocus, onBlur } = $(
    useIsFocused({
        onFocus() {
            emit('focus')
        },
        onBlur() {
            emit('blur')
        },
    }),
)

const step = $computed(() => STEP_INFOS[stepKey])

const dateInput: HTMLInputElement = $ref()
const timeInput: HTMLInputElement = $ref()

let inputDateTime: Date | undefined = $ref(modelValue)
let inputDateString: string | undefined = $ref(formatDate(inputDateTime))
let inputTimeString: string | undefined = $ref(formatTime(inputDateTime))

let outputDateTime: Date | undefined = $ref(modelValue)

const minDateString = $computed(() => formatDate(min))
const maxDateString = $computed(() => formatDate(max))

const invalidTime: boolean = $computed(() => {
    if (!inputDateTime) {
        return false
    }

    const time = step.floor(inputDateTime).valueOf()
    return time < min.valueOf() || time > max.valueOf()
})

watch([$$(modelValue), $$(isFocused)], ([modelValue, isFocused]) => {
    // 在用户输入时，不应打乱用户的状态（但这却会导致用户结束输入之后，输入框内容突变为其它值，
    // 不过在现实中，这种场景应该极少出现）
    if (isFocused) {
        return
    }

    // 若用户清除日期或时间中的某一项（年、月、日、时、分、秒），此时会通知外部值改变为
    // undefined，但若此时将外部值同步回内部，会导致其它项也变为 undefined，这应该不是用户
    // 所期望的。因此添加该判断，来防止这种现象出现。
    if (isSameTime(modelValue, outputDateTime)) {
        return
    }

    inputDateTime = outputDateTime = modelValue
    inputDateString = formatDate(inputDateTime)
    inputTimeString = formatTime(inputDateTime)
})

watch([$$(step)], () => {
    // 但一定要注意，step 的改变只可能是从外部引起的，此时我们一定要刷新 inputTimeString
    inputTimeString = formatTime(inputDateTime)
})

function onDateChange() {
    inputDateString = dateInput.value
    onModelValueChange()
}

function onTimeChange() {
    inputTimeString = timeInput.value
    onModelValueChange()
}

function onModelValueChange() {
    inputDateTime = mergeDateAndTime(parseDate(inputDateString), parseTime(inputTimeString))
    outputDateTime = inputDateTime ? clampTime(inputDateTime, min, max) : inputDateTime
    emit('update:modelValue', outputDateTime)
}

function formatDate(date: Date | undefined) {
    try {
        return format(date!, 'yyyy-MM-dd')
    } catch {
        return undefined
    }
}

function parseDate(str: string | undefined) {
    try {
        const date = parse(str!, 'yyyy-MM-dd', 0)
        return isValid(date) ? date : undefined
    } catch {
        return undefined
    }
}

function formatTime(time: Date | undefined) {
    try {
        return format(time!, step.tf)
    } catch {
        return undefined
    }
}

function parseTime(str: string | undefined) {
    try {
        const time = parse(str!, step.tf, 0)
        return isValid(time) ? time : undefined
    } catch {
        return undefined
    }
}
</script>
