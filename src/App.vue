<script setup lang="ts">
import { Ref } from 'vue'
import { addHours, parse, isValid } from 'date-fns'
import TimeRangeSlider from './components/time-range-slider'
import { SliderStep } from './components/time-range-slider/util'

let step: SliderStep = $ref('second')
let min = new Date(2022, 0, 1, 15, 9, 12, 192)
let max = new Date(2022, 0, 17, 12, 38, 43, 894)
let limit = 1000 * 60 * 60 * 24 * 7
let timeRange: Date[] | undefined = $ref([
    new Date(2022, 0, 5, 23, 30),
    new Date(2022, 0, 2, 0, 30),
])
// let timeRange = $ref([new Date(2022, 0, 2, 0, 0), new Date(2022, 0, 5, 23, 59, 59, 999)])
// let timeRange = $ref([new Date(2022, 0, 2, 0, 30), new Date(2022, 0, 2, 23, 30)])

let isMutation = $ref(false)

function onTimeRangeChange(range: any) {
    if (isMutation) {
        if (range) {
            range = [addHours(range[0], 1), addHours(range[1], 2)]
        }
    }

    timeRange = range
}

let dateTimeInputValue: Date | null = $ref(new Date(2022, 1, 2, 15, 9, 12, 192))

const inputMinStr: string = $ref('2022-01-02 12:09:12')
const inputMaxStr: string = $ref('2022-01-06 15:38:43')

const inputMin: Date | undefined = $computed(() => parseDateTime(inputMinStr))
const inputMax: Date | undefined = $computed(() => parseDateTime(inputMaxStr))

function onInputFocus() {
    console.info('input focus')
}

function onInputBlur() {
    console.info('input blur')
}

function parseDateTime(str: string) {
    try {
        const value = parse(str, 'yyyy-MM-dd HH:mm:ss', 0)
        return isValid(value) ? value : undefined
    } catch {
        return undefined
    }
}
</script>

<template>
    <h1>TimeRangeSlider</h1>

    <button @click="timeRange = undefined">clean</button>
    {{ { modelValue: timeRange } }}

    <br />

    <label>
        <input type="radio" name="step" v-model="step" value="second" />
        second
    </label>
    <label>
        <input type="radio" name="step" v-model="step" value="minute" />
        minute
    </label>
    <label>
        <input type="radio" name="step" v-model="step" value="hour" />
        hour
    </label>

    <br />

    <label>
        <input type="checkbox" v-model="isMutation" />
        change range value on component update modelValue
    </label>

    <br />

    <TimeRangeSlider
        :modelValue="timeRange"
        :min="min"
        :max="max"
        :limit="limit"
        :step="step"
        @change="onTimeRangeChange"
    />

    <hr />

    <h1>TimeRangeSlider.DateTimeInput</h1>

    <label>min: <input v-model="inputMinStr" /></label>
    <label>max: <input v-model="inputMaxStr" /></label>

    <br />

    <button @click="dateTimeInputValue = null">clean</button>
    {{ { modelValue: dateTimeInputValue } }}

    <br />
    <br />

    <TimeRangeSlider.DateTimeInput
        v-model="dateTimeInputValue"
        :min="inputMin"
        :max="inputMax"
        @focus="onInputFocus"
        @blur="onInputBlur"
    />

    <hr />

    <h1>TimeRangeSlider.SliderBar</h1>

    <h2>timeRange: undefined</h2>
    <TimeRangeSlider.SliderBar
        :date="new Date(2022, 0, 5)"
        :timeRange="undefined"
        style="border: 1px solid #000"
    />

    <h2>timeRange: [undefined, undefined]</h2>
    <TimeRangeSlider.SliderBar
        :date="new Date(2022, 0, 5)"
        :timeRange="[undefined, undefined]"
        style="border: 1px solid #000"
    />

    <h2>timeRange: [2022-01-05 12:00, undefined]</h2>
    <TimeRangeSlider.SliderBar
        :date="new Date(2022, 0, 5)"
        :timeRange="[new Date(2022, 0, 5, 12), undefined]"
        style="border: 1px solid #000"
    />

    <h2>timeRange: [undefined, 2022-01-05 12:00]</h2>
    <TimeRangeSlider.SliderBar
        :date="new Date(2022, 0, 5)"
        :timeRange="[undefined, new Date(2022, 0, 5, 12)]"
        style="border: 1px solid #000"
    />

    <h2>timeRange: [2022-01-05 12:00, 2022-01-05 23:59]</h2>
    <TimeRangeSlider.SliderBar
        :date="new Date(2022, 0, 5)"
        :timeRange="[new Date(2022, 0, 5, 12), new Date(2022, 0, 5, 23, 59)]"
        style="border: 1px solid #000"
    />

    <h2>timeRange: [2022-01-05 23:59, 2022-01-05 12:00]</h2>
    <TimeRangeSlider.SliderBar
        :date="new Date(2022, 0, 5)"
        :timeRange="[new Date(2022, 0, 5, 23, 59), new Date(2022, 0, 5, 12)]"
        style="border: 1px solid #000"
    />

    <h2>min: 2022-01-05 08:30:29, max: undefined</h2>
    <TimeRangeSlider.SliderBar
        :date="new Date(2022, 0, 5)"
        :min="new Date(2022, 0, 5, 8, 30, 29)"
        :timeRange="[new Date(2022, 0, 5, 12), new Date(2022, 0, 5, 23, 59)]"
        style="border: 1px solid #000"
    />

    <h2>min: undefined, max: 2022-01-05 23:09:56</h2>
    <TimeRangeSlider.SliderBar
        :date="new Date(2022, 0, 5)"
        :max="new Date(2022, 0, 5, 23, 9, 56)"
        :timeRange="[new Date(2022, 0, 5, 12), new Date(2022, 0, 5, 23, 59)]"
        style="border: 1px solid #000"
    />

    <h2>min: 2022-01-05 08:30:29, max: 2022-01-05 23:09:56</h2>
    <TimeRangeSlider.SliderBar
        :date="new Date(2022, 0, 5)"
        :min="new Date(2022, 0, 5, 8, 30, 29)"
        :max="new Date(2022, 0, 5, 23, 9, 56)"
        :timeRange="[new Date(2022, 0, 5, 12), new Date(2022, 0, 5, 23, 59)]"
        style="border: 1px solid #000"
    />

    <h2>hintTime: undefined</h2>
    <TimeRangeSlider.SliderBar
        :date="new Date(2022, 0, 5)"
        :timeRange="[new Date(2022, 0, 5, 12), new Date(2022, 0, 5, 23, 59)]"
        :hintTime="undefined"
        style="border: 1px solid #000"
    />

    <h2>hintTime: 2022-01-06 15:24:00</h2>
    <TimeRangeSlider.SliderBar
        :date="new Date(2022, 0, 5)"
        :timeRange="[new Date(2022, 0, 5, 12), new Date(2022, 0, 5, 23, 59)]"
        :hintTime="new Date(2022, 0, 6, 15, 24, 0)"
        style="border: 1px solid #000"
    />

    <h2>hintTime: 2022-01-05 08:30:29</h2>
    <TimeRangeSlider.SliderBar
        :date="new Date(2022, 0, 5)"
        :timeRange="[new Date(2022, 0, 5, 12), new Date(2022, 0, 5, 23, 59)]"
        :hintTime="new Date(2022, 0, 5, 8, 30, 29)"
        style="border: 1px solid #000"
    />
</template>

<style>
#app {
    color: #2c3e50;
    margin-top: 60px;
    font-family: -apple-system, BlinkMacSystemFont, segoe ui, Roboto, helvetica neue, Arial,
        noto sans, sans-serif;
}
</style>
