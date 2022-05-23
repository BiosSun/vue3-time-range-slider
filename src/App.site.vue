<script setup lang="ts">
import TimeRangeSlider from './components/time-range-slider'
import { subMonths, subHours, subMinutes } from 'date-fns'

const debug = new URL(window.location.href).searchParams.get('debug') === '1'

const visible = $ref(true)

const max = new Date()
const min = subMonths(max, 3)

const modelValue = $ref([subHours(max, 192), subMinutes(subHours(max, 24), 1)])

const SEVEN_DAYS = 1000 * 60 * 60 * 24 * 7
</script>

<template>
    <div class="content">
        <h1 class="title">
            Time Range Slider &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;
            &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;
            &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;
            &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;
        </h1>

        <div v-if="debug" class="debug">
            <button @click="visible = !visible">toggle visible</button>
        </div>

        <TimeRangeSlider
            v-if="visible"
            class="slider"
            v-model="modelValue"
            step="minute"
            :min="min"
            :max="max"
            :limit="SEVEN_DAYS"
        />
    </div>
</template>

<style scoped>
.content {
    width: 600px;
    margin: 60px auto;
    color: #20282f;
    font-family: -apple-system, BlinkMacSystemFont, segoe ui, Roboto, helvetica neue, Arial,
        noto sans, sans-serif;
}

.title {
    text-decoration: underline;
    white-space: nowrap;
    overflow: hidden;
    font-size: 34px;
    margin-bottom: 40px;
}

.debug {
    margin: 40px 0;
}

.slider {
    width: 100%;
    height: 380px;
}
</style>
