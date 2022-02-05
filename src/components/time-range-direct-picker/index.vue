<template>
    <div style="border: 1px solid #000; height: 290px; overflow: auto">
        <template v-for="date of dates" :key="date.valueOf()">
            <DayBar :date="date" :timeRange="timeRange" @picking="onPicking" @picked="onPicked" />
        </template>
    </div>
</template>
<script lang="ts">
export default { name: 'TimeRangeDirectPicker' }
</script>
<script lang="ts" setup>
import DayBar from './day-bar.vue'

const props = defineProps<{
    modelValue?: Date[]
}>()

const emit = defineEmits(['update:modelValue'])

const dates = [
    new Date(2022, 0, 1),
    new Date(2022, 0, 2),
    new Date(2022, 0, 3),
    new Date(2022, 0, 4),
    new Date(2022, 0, 5),
    new Date(2022, 0, 6),
    new Date(2022, 0, 7),
    new Date(2022, 0, 8),
    new Date(2022, 0, 9),
    new Date(2022, 0, 10),
    new Date(2022, 0, 11),
]

const selectingTimeRange = $ref(undefined)

function onPicking() {}

function onPicked() {}

const timeRange = $computed(() => {
    const timeRange = selectingTimeRange ?? props.modelValue

    if (!timeRange) {
        return timeRange
    }

    return [...timeRange].filter((t) => !!t).sort((t1, t2) => t1.valueOf() - t2.valueOf())
})
</script>
<style lang="scss" module></style>
