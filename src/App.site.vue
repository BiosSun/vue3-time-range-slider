<script setup lang="ts">
import TimeRangeSlider from './components/time-range-slider'
import { subMonths, subHours, subMinutes } from 'date-fns'

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

        <TimeRangeSlider
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

.slider {
    width: 100%;
    height: 380px;
}
</style>
