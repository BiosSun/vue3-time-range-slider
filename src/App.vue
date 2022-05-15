<script setup lang="ts">
import { addHours } from 'date-fns'
import TimeRangeSlider from './components/time-range-slider'
import { SliderStep } from './components/time-range-slider/util'
import DateTimeInput from './date-time-input.vue'

let step: SliderStep = $ref('second')
const sliderMin: Date = $ref(new Date(2022, 0, 1, 15, 9, 12, 192))
const sliderMax: Date = $ref(new Date(2022, 0, 17, 12, 38, 43, 894))
let limitEnable = $ref(true)
let limit = 1000 * 60 * 60 * 24 * 7
let timeRange: (Date | undefined)[] = $ref([
    new Date(2022, 0, 5, 23, 45, 20, 111),
    new Date(2022, 0, 2, 0, 20, 51, 555),
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

let dateTimeInputValue: Date | undefined = $ref(new Date(2022, 1, 2, 15, 9, 12, 192))

const inputStep: SliderStep = $ref('second')
const inputMin: Date | undefined = $ref(new Date(2022, 0, 2, 12, 9, 12, 938))
const inputMax: Date | undefined = $ref(new Date(2022, 0, 6, 15, 38, 43, 189))

function onInputFocus() {
    console.info('input focus')
}

function onInputBlur() {
    console.info('input blur')
}

const sliderStep: SliderStep = $ref('second')
</script>

<template>
    <h1>TimeRangeSlider</h1>

    <DateTimeInput label="start" v-model="timeRange[0]" />&nbsp;
    <DateTimeInput label="end" v-model="timeRange[1]" /><br />
    <button @click="timeRange = [undefined, undefined]">clean all</button>&nbsp;
    {{ { modelValue: timeRange } }}

    <br />

    <label><input type="radio" name="step" v-model="step" value="second" /> second</label>
    <label><input type="radio" name="step" v-model="step" value="minute" /> minute</label>
    <label><input type="radio" name="step" v-model="step" value="hour" /> hour</label>

    <br />

    <DateTimeInput label="min" v-model="sliderMin" />&nbsp;
    <DateTimeInput label="min" v-model="sliderMax" />

    <br />

    <label><input type="checkbox" v-model="limitEnable" /> limit enable</label>
    &nbsp;
    <input type="number" v-model="limit" :disabled="!limitEnable" />

    <br />

    <label>
        <input type="checkbox" v-model="isMutation" />
        change range value on component update modelValue
    </label>

    <br />

    <TimeRangeSlider
        :modelValue="timeRange"
        :min="sliderMin"
        :max="sliderMax"
        :limit="limitEnable ? limit : undefined"
        :step="step"
        @change="onTimeRangeChange"
    />

    <hr />

    <h1>TimeRangeSlider.DateTimeInput</h1>

    <br />

    <DateTimeInput label="time" v-model="dateTimeInputValue" />&nbsp;
    {{ { modelValue: dateTimeInputValue } }}

    <br />

    <DateTimeInput label="min" v-model="inputMin" />&nbsp;
    <DateTimeInput label="min" v-model="inputMax" />

    <br />

    <label><input type="radio" name="inputStep" v-model="inputStep" value="second" /> second</label>
    <label><input type="radio" name="inputStep" v-model="inputStep" value="minute" /> minute</label>
    <label><input type="radio" name="inputStep" v-model="inputStep" value="hour" /> hour</label>

    <br />
    <br />

    <TimeRangeSlider.DateTimeInput
        v-model="dateTimeInputValue"
        :min="inputMin"
        :max="inputMax"
        :step="inputStep"
        @focus="onInputFocus"
        @blur="onInputBlur"
    />

    <hr />

    <h1>TimeRangeSlider.SliderBar</h1>

    <label
        ><input type="radio" name="sliderStep" v-model="sliderStep" value="second" /> second</label
    >
    <label
        ><input type="radio" name="sliderStep" v-model="sliderStep" value="minute" /> minute</label
    >
    <label><input type="radio" name="sliderStep" v-model="sliderStep" value="hour" /> hour</label>

    <hr />

    <h2>timeRange: [undefined, undefined]</h2>
    <TimeRangeSlider.SliderBar
        :date="new Date(2022, 0, 5)"
        :timeRange="[undefined, undefined]"
        :step="sliderStep"
        style="border: 1px solid #000"
    />

    <h2>timeRange: [2022-01-05 12:00, undefined]</h2>
    <TimeRangeSlider.SliderBar
        :date="new Date(2022, 0, 5)"
        :timeRange="[new Date(2022, 0, 5, 12), undefined]"
        :step="sliderStep"
        style="border: 1px solid #000"
    />

    <h2>timeRange: [undefined, 2022-01-05 12:00]</h2>
    <TimeRangeSlider.SliderBar
        :date="new Date(2022, 0, 5)"
        :timeRange="[undefined, new Date(2022, 0, 5, 12)]"
        :step="sliderStep"
        style="border: 1px solid #000"
    />

    <h2>timeRange: [2022-01-05 12:00, 2022-01-05 23:59]</h2>
    <TimeRangeSlider.SliderBar
        :date="new Date(2022, 0, 5)"
        :timeRange="[new Date(2022, 0, 5, 12), new Date(2022, 0, 5, 23, 59)]"
        :step="sliderStep"
        style="border: 1px solid #000"
    />

    <h2>timeRange: [2022-01-05 23:59, 2022-01-05 12:00]</h2>
    <TimeRangeSlider.SliderBar
        :date="new Date(2022, 0, 5)"
        :timeRange="[new Date(2022, 0, 5, 23, 59), new Date(2022, 0, 5, 12)]"
        :step="sliderStep"
        style="border: 1px solid #000"
    />

    <h2>min: 2022-01-05 08:30:29, max: undefined</h2>
    <TimeRangeSlider.SliderBar
        :date="new Date(2022, 0, 5)"
        :timeRange="[new Date(2022, 0, 5, 12), new Date(2022, 0, 5, 23, 59)]"
        :min="new Date(2022, 0, 5, 8, 30, 29)"
        :step="sliderStep"
        style="border: 1px solid #000"
    />

    <h2>min: undefined, max: 2022-01-05 23:09:56</h2>
    <TimeRangeSlider.SliderBar
        :date="new Date(2022, 0, 5)"
        :timeRange="[new Date(2022, 0, 5, 12), new Date(2022, 0, 5, 23, 59)]"
        :max="new Date(2022, 0, 5, 23, 9, 56)"
        :step="sliderStep"
        style="border: 1px solid #000"
    />

    <h2>min: 2022-01-05 08:30:29, max: 2022-01-05 23:09:56</h2>
    <TimeRangeSlider.SliderBar
        :date="new Date(2022, 0, 5)"
        :timeRange="[new Date(2022, 0, 5, 12), new Date(2022, 0, 5, 23, 59)]"
        :min="new Date(2022, 0, 5, 8, 30, 29)"
        :max="new Date(2022, 0, 5, 23, 9, 56)"
        :step="sliderStep"
        style="border: 1px solid #000"
    />

    <h2>hintTime: undefined</h2>
    <TimeRangeSlider.SliderBar
        :date="new Date(2022, 0, 5)"
        :timeRange="[new Date(2022, 0, 5, 12), new Date(2022, 0, 5, 23, 59)]"
        :hintTime="undefined"
        :step="sliderStep"
        style="border: 1px solid #000"
    />

    <h2>hintTime: 2022-01-06 15:24:00</h2>
    <TimeRangeSlider.SliderBar
        :date="new Date(2022, 0, 5)"
        :timeRange="[new Date(2022, 0, 5, 12), new Date(2022, 0, 5, 23, 59)]"
        :hintTime="new Date(2022, 0, 6, 15, 24, 0)"
        :step="sliderStep"
        style="border: 1px solid #000"
    />

    <h2>hintTime: 2022-01-05 08:30:29</h2>
    <TimeRangeSlider.SliderBar
        :date="new Date(2022, 0, 5)"
        :timeRange="[new Date(2022, 0, 5, 12), new Date(2022, 0, 5, 23, 59)]"
        :hintTime="new Date(2022, 0, 5, 8, 30, 29)"
        :step="sliderStep"
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
