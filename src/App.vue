<script setup lang="ts">
import TimeRangePicker from './components/time-range-picker'

const min = new Date(2022, 0, 1, 15, 9, 12, 192)
const max = new Date(2022, 0, 31, 12, 38, 43, 894)
const limit = 1000 * 60 * 60 * 24 * 7
const timeRange = $ref([new Date(2022, 0, 5, 23, 30), new Date(2022, 0, 2, 0, 30)])
// const timeRange = $ref([new Date(2022, 0, 2, 0, 0), new Date(2022, 0, 5, 23, 59, 59, 999)])
// const timeRange = $ref([new Date(2022, 0, 2, 0, 30), new Date(2022, 0, 2, 23, 30)])

const activated = $ref(false)

function onPicking(time: Date) {
    console.info('picking', time)
}

function onPicked(time: Date) {
    console.info('picked', time)
}
</script>

<template>
    <h1>TimeRangePicker</h1>

    {{ timeRange }}

    <TimeRangePicker v-model="timeRange" :min="min" :max="max" :limit="limit" />

    <hr />

    <h1>TimeRangePicker.DayBar</h1>

    <label><input type="checkbox" v-model="activated" /> Activated: {{ activated }}</label>

    <h2>timeRange: undefined</h2>
    <TimeRangePicker.DayBar
        :activated="activated"
        :date="new Date(2022, 0, 5)"
        :timeRange="undefined"
        @picking="onPicking"
        @picked="onPicked"
        style="border: 1px solid #000"
    />

    <h2>timeRange: [undefined, undefined]</h2>
    <TimeRangePicker.DayBar
        :activated="activated"
        :date="new Date(2022, 0, 5)"
        :timeRange="[undefined, undefined]"
        @picking="onPicking"
        @picked="onPicked"
        style="border: 1px solid #000"
    />

    <h2>timeRange: [2022-01-05 12:00, undefined]</h2>
    <TimeRangePicker.DayBar
        :activated="activated"
        :date="new Date(2022, 0, 5)"
        :timeRange="[new Date(2022, 0, 5, 12), undefined]"
        @picking="onPicking"
        @picked="onPicked"
        style="border: 1px solid #000"
    />

    <h2>timeRange: [2022-01-05 12:00, 2022-01-05 23:59]</h2>
    <TimeRangePicker.DayBar
        :activated="activated"
        :date="new Date(2022, 0, 5)"
        :timeRange="[new Date(2022, 0, 5, 12), new Date(2022, 0, 5, 23, 59)]"
        @picking="onPicking"
        @picked="onPicked"
        style="border: 1px solid #000"
    />

    <h2>min: 2022-01-05 08:30:29, max: undefined</h2>
    <TimeRangePicker.DayBar
        :activated="activated"
        :date="new Date(2022, 0, 5)"
        :min="new Date(2022, 0, 5, 8, 30, 29)"
        :timeRange="[new Date(2022, 0, 5, 12), new Date(2022, 0, 5, 23, 59)]"
        @picking="onPicking"
        @picked="onPicked"
        style="border: 1px solid #000"
    />

    <h2>min: undefined, max: 2022-01-05 23:09:56</h2>
    <TimeRangePicker.DayBar
        :activated="activated"
        :date="new Date(2022, 0, 5)"
        :max="new Date(2022, 0, 5, 23, 9, 56)"
        :timeRange="[new Date(2022, 0, 5, 12), new Date(2022, 0, 5, 23, 59)]"
        @picking="onPicking"
        @picked="onPicked"
        style="border: 1px solid #000"
    />

    <h2>min: 2022-01-05 08:30:29, max: 2022-01-05 23:09:56</h2>
    <TimeRangePicker.DayBar
        :activated="activated"
        :date="new Date(2022, 0, 5)"
        :min="new Date(2022, 0, 5, 8, 30, 29)"
        :max="new Date(2022, 0, 5, 23, 9, 56)"
        :timeRange="[new Date(2022, 0, 5, 12), new Date(2022, 0, 5, 23, 59)]"
        @picking="onPicking"
        @picked="onPicked"
        style="border: 1px solid #000"
    />
</template>

<style>
#app {
    color: #2c3e50;
    margin-top: 60px;
}
</style>
