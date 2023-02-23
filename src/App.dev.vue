<script setup lang="ts">
import { addHours } from 'date-fns'
import TimeRangeSlider from './components/time-range-slider'
import SliderBar from './components/time-range-slider/slider-bar.vue'
import DateTimeInput from './components/time-range-slider/date-time-input.vue'
import { SliderStep } from './components/time-range-slider/util'
import DateTimeInputTool from './dev.date-time-input.vue'

let visible: boolean = $ref(true)
let step: SliderStep = $ref('second')
const sliderMin: Date = $ref(new Date(2022, 0, 1, 15, 9, 12, 192))
const sliderMax: Date = $ref(new Date(2022, 3, 17, 12, 38, 43, 894))
let limitEnable = $ref(true)
let limit = 1000 * 60 * 60 * 24 * 7
let timeRange: (Date | undefined)[] = $ref([
    new Date(2022, 3, 17, 10, 0, 0, 0),
    new Date(2022, 3, 17, 12, 38, 43, 894),
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

function onTimeRangeStartPicking() {
    console.info('- onTimeRangeStartPicking')
}

function onTimeRangePicking() {
    console.info('- onTimeRangePicking')
}

function onTimeRangeEndPicking() {
    console.info('- onTimeRangeEndPicking')
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
    <div class="content">
        <DateTimeInputTool label="start" v-model="timeRange[0]" />&nbsp;
        <DateTimeInputTool label="end" v-model="timeRange[1]" /><br />
        <button @click="timeRange = [undefined, undefined]">clean all</button>&nbsp;
        <!-- prettier-ignore -->
        {{ ( { modelValue: timeRange } ) }}

        <br />

        <label><input type="radio" name="step" v-model="step" value="second" /> second</label>
        <label><input type="radio" name="step" v-model="step" value="minute" /> minute</label>
        <label><input type="radio" name="step" v-model="step" value="hour" /> hour</label>

        <br />

        <DateTimeInputTool label="min" v-model="sliderMin" />&nbsp;
        <DateTimeInputTool label="min" v-model="sliderMax" />

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

        <button @click="visible = !visible">toggle visible</button>

        <br />

        <TimeRangeSlider
            v-if="visible"
            :modelValue="timeRange"
            :min="sliderMin"
            :max="sliderMax"
            :limit="limitEnable ? limit : undefined"
            :step="step"
            style="width: 735px; height: 350px; margin: 30px auto"
            @change="onTimeRangeChange"
            @startPicking="onTimeRangeStartPicking"
            @picking="onTimeRangePicking"
            @endPicking="onTimeRangeEndPicking"
        />

        <hr />

        <h1>TimeRangeSlider.DateTimeInput</h1>

        <br />

        <DateTimeInputTool label="time" v-model="dateTimeInputValue" />&nbsp;
        <!-- prettier-ignore -->
        {{ ( { modelValue: dateTimeInputValue } ) }}

        <br />

        <DateTimeInputTool label="min" v-model="inputMin" />&nbsp;
        <DateTimeInputTool label="min" v-model="inputMax" />

        <br />

        <label
            ><input type="radio" name="inputStep" v-model="inputStep" value="second" />
            second</label
        >
        <label
            ><input type="radio" name="inputStep" v-model="inputStep" value="minute" />
            minute</label
        >
        <label><input type="radio" name="inputStep" v-model="inputStep" value="hour" /> hour</label>

        <br />
        <br />

        <DateTimeInput
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
            ><input type="radio" name="sliderStep" v-model="sliderStep" value="second" />
            second</label
        >
        <label
            ><input type="radio" name="sliderStep" v-model="sliderStep" value="minute" />
            minute</label
        >
        <label
            ><input type="radio" name="sliderStep" v-model="sliderStep" value="hour" /> hour</label
        >

        <hr />

        <h2>timeRange: [undefined, undefined]</h2>
        <SliderBar
            :date="new Date(2022, 0, 5)"
            :timeRange="[undefined, undefined]"
            :step="sliderStep"
            style="border: 1px solid #000"
        />

        <h2>timeRange: [2022-01-05 12:00, undefined]</h2>
        <SliderBar
            :date="new Date(2022, 0, 5)"
            :timeRange="[new Date(2022, 0, 5, 12), undefined]"
            :step="sliderStep"
            style="border: 1px solid #000"
        />

        <h2>timeRange: [undefined, 2022-01-05 12:00]</h2>
        <SliderBar
            :date="new Date(2022, 0, 5)"
            :timeRange="[undefined, new Date(2022, 0, 5, 12)]"
            :step="sliderStep"
            style="border: 1px solid #000"
        />

        <h2>timeRange: [2022-01-05 12:00, 2022-01-05 23:59]</h2>
        <SliderBar
            :date="new Date(2022, 0, 5)"
            :timeRange="[new Date(2022, 0, 5, 12), new Date(2022, 0, 5, 23, 59)]"
            :step="sliderStep"
            style="border: 1px solid #000"
        />

        <h2>timeRange: [2022-01-05 23:59, 2022-01-05 12:00]</h2>
        <SliderBar
            :date="new Date(2022, 0, 5)"
            :timeRange="[new Date(2022, 0, 5, 23, 59), new Date(2022, 0, 5, 12)]"
            :step="sliderStep"
            style="border: 1px solid #000"
        />

        <h2>min: 2022-01-05 08:30:29, max: undefined</h2>
        <SliderBar
            :date="new Date(2022, 0, 5)"
            :timeRange="[new Date(2022, 0, 5, 12), new Date(2022, 0, 5, 23, 59)]"
            :min="new Date(2022, 0, 5, 8, 30, 29)"
            :step="sliderStep"
            style="border: 1px solid #000"
        />

        <h2>min: undefined, max: 2022-01-05 23:09:56</h2>
        <SliderBar
            :date="new Date(2022, 0, 5)"
            :timeRange="[new Date(2022, 0, 5, 12), new Date(2022, 0, 5, 23, 59)]"
            :max="new Date(2022, 0, 5, 23, 9, 56)"
            :step="sliderStep"
            style="border: 1px solid #000"
        />

        <h2>min: 2022-01-05 08:30:29, max: 2022-01-05 23:09:56</h2>
        <SliderBar
            :date="new Date(2022, 0, 5)"
            :timeRange="[new Date(2022, 0, 5, 12), new Date(2022, 0, 5, 23, 59)]"
            :min="new Date(2022, 0, 5, 8, 30, 29)"
            :max="new Date(2022, 0, 5, 23, 9, 56)"
            :step="sliderStep"
            style="border: 1px solid #000"
        />

        <h2>hintTime: undefined</h2>
        <SliderBar
            :date="new Date(2022, 0, 5)"
            :timeRange="[new Date(2022, 0, 5, 12), new Date(2022, 0, 5, 23, 59)]"
            :hintTime="undefined"
            :step="sliderStep"
            style="border: 1px solid #000"
        />

        <h2>hintTime: 2022-01-06 15:24:00</h2>
        <SliderBar
            :date="new Date(2022, 0, 5)"
            :timeRange="[new Date(2022, 0, 5, 12), new Date(2022, 0, 5, 23, 59)]"
            :hintTime="new Date(2022, 0, 6, 15, 24, 0)"
            :step="sliderStep"
            style="border: 1px solid #000"
        />

        <h2>hintTime: 2022-01-05 08:30:29</h2>
        <SliderBar
            :date="new Date(2022, 0, 5)"
            :timeRange="[new Date(2022, 0, 5, 12), new Date(2022, 0, 5, 23, 59)]"
            :hintTime="new Date(2022, 0, 5, 8, 30, 29)"
            :step="sliderStep"
            style="border: 1px solid #000"
        />
    </div>
</template>

<style scoped>
.content {
    color: #20282f;
    margin: 60px;
    font-family: -apple-system, BlinkMacSystemFont, segoe ui, Roboto, helvetica neue, Arial,
        noto sans, sans-serif;
}
</style>
<style>
button {
    box-sizing: border-box;
    height: 26px;
    padding-left: 8px;
    padding-right: 8px;
    background-color: #f0f1f3;
    border: 1px solid #c0c1c3;
    border-radius: 3px;
    vertical-align: middle;
}

button:hover {
    background-color: #e0e1e3;
}

button:active {
    background-color: #d0d1d3;
}

input[type='text'],
input[type='number'],
input[type='datetime-local'] {
    box-sizing: border-box;
    height: 26px;
    border: 1px solid #c0c1c3;
    background-color: #fff;
    border-radius: 3px;
    vertical-align: middle;
}

input[type='text']:has(+ button),
input[type='number']:has(+ button),
input[type='datetime-local']:has(+ button) {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
}

input[type='text'] + button,
input[type='number'] + button,
input[type='datetime-local'] + button {
    border-left: 0;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
}
</style>
