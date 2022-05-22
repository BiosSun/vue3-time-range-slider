<template>
    <label>
        {{ label }}:
        <input
            type="datetime-local"
            style="height: 22px"
            :value="datetimeStr"
            @change="onInputChange"
            step="1"
        />
        <button @click="onChange(undefined)">x</button>
    </label>
</template>
<script lang="ts" setup>
import { toRef, watch } from 'vue'
import { format, parse, isValid } from 'date-fns'

const DATE_TIME_TEMPLATE = "yyyy-MM-dd'T'HH:mm:ss.SSS"

const props = defineProps<{
    label: string
    modelValue: Date | undefined
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', value: Date | undefined): void
}>()

let datetime: Date | undefined = $ref(undefined)
let datetimeStr: string | undefined = $ref(undefined)

watch(
    toRef(props, 'modelValue'),
    (value) => {
        if (isSameTime(value, datetime)) {
            return
        }

        datetime = value
        datetimeStr = formatDateTime(datetime)
    },
    { immediate: true },
)

function onInputChange(event: Event) {
    onChange((event.target as HTMLInputElement | null)?.value)
}

function onChange(str: string | undefined) {
    datetimeStr = str
    datetime = parseDateTime(datetimeStr)
    emit('update:modelValue', datetime)
}

function isSameTime(d1: Date | undefined, d2: Date | undefined) {
    return d1 === d2 || d1?.valueOf() === d2?.valueOf()
}

function formatDateTime(date: Date | undefined) {
    try {
        return format(date!, DATE_TIME_TEMPLATE)
    } catch (e) {
        return undefined
    }
}

function parseDateTime(str: string | undefined) {
    const templates = [DATE_TIME_TEMPLATE, "yyyy-MM-dd'T'HH:mm:ss", "yyyy-MM-dd'T'HH:mm"]

    for (const template of templates) {
        try {
            const datetime = parse(str!, template, 0)
            console.info(str, template, datetime)

            if (isValid(datetime)) {
                return datetime
            }
        } catch {}
    }

    return undefined
}
</script>
