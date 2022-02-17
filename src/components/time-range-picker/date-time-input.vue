<template>
    <div
        class="r-time-range-direct-picker__date-time-input"
        :class="{ 'r-time-range-direct-picker__date-time-input--warned': warned }"
    >
        <input
            class="r-time-range-direct-picker__date-time-input__input r-time-range-direct-picker__date-time-input__date-input"
            ref="dateInput"
            type="date"
            :value="inputDateString"
            :min="minDateAndMaxDateStrings[0]"
            :max="minDateAndMaxDateStrings[1]"
            @change="onDateChange"
            @focus="onFocus"
            @blur="onBlur"
        />
        <input
            class="r-time-range-direct-picker__date-time-input__input r-time-range-direct-picker__date-time-input__time-input"
            ref="timeInput"
            type="time"
            :step="1"
            :value="inputTimeString"
            :min="minTimeAndMaxTimeStrings[0]"
            :max="minTimeAndMaxTimeStrings[1]"
            @change="onTimeChange"
            @focus="onFocus"
            @blur="onBlur"
        />
    </div>
</template>
<script lang="ts" setup>
import { format, parse, isValid, isSameDay } from 'date-fns'
import { toRef, watch } from 'vue'
import useIsFocused from './use-is-focused'
import { clampTime, isSameTime, mergeDateAndTime } from './util'

const { modelValue, min, max, warned } = defineProps<{
    modelValue: Date | undefined
    min?: Date
    max?: Date
    warned?: boolean
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

const dateInput: HTMLInputElement = $ref()
const timeInput: HTMLInputElement = $ref()

let inputDateTime: Date | undefined = $ref(modelValue)
let inputDateString: string | undefined = $ref(formatDate(inputDateTime))
let inputTimeString: string | undefined = $ref(formatTime(inputDateTime))

let outputDateTime: Date | undefined = $ref(modelValue)

const minDateAndMaxDateStrings: (string | undefined)[] = $computed(() => [
    formatDate(min),
    formatDate(max),
])

const minTimeAndMaxTimeStrings: (string | undefined)[] = $computed(() => {
    const minTimeString = isSameDay(inputDateTime!, min!) ? formatTime(min) : undefined
    const maxTimeString = isSameDay(inputDateTime!, max!) ? formatTime(max) : undefined
    return [minTimeString, maxTimeString]
})

watch([$$(modelValue), isFocused], ([modelValue, isFocused]) => {
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
        return format(time!, 'HH:mm:ss')
    } catch {
        return undefined
    }
}

function parseTime(str: string | undefined) {
    try {
        const time = parse(str!, 'HH:mm:ss', 0)
        return isValid(time) ? time : undefined
    } catch {
        return undefined
    }
}
</script>
<style lang="scss">
.r-time-range-direct-picker__date-time-input {
    display: flex;
    gap: 8px;
}

.r-time-range-direct-picker__date-time-input__input {
    box-sizing: border-box;
    border: 1px solid #767676;
    border-radius: 2px;
    height: 24px;
    padding: 0 0 0 2px;

    &::-webkit-calendar-picker-indicator {
        margin-inline-start: 0;
    }

    &:invalid,
    .r-time-range-direct-picker__date-time-input--warned & {
        border-color: #d48806;
        background: #fffbe6;
    }
}

.r-time-range-direct-picker__date-time-input__date-input {
    width: 120px;
}
</style>
