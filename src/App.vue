<script setup lang="ts">
import DateRangeDirectPicker from './components/date-range-direct-picker/index.vue'

const timeRange = $ref([new Date(2022, 0, 5, 23, 30), new Date(2022, 0, 2, 0, 30)])
// const timeRange = $ref([new Date(2022, 0, 2, 0, 0), new Date(2022, 0, 5, 23, 59, 59, 999)])
// const timeRange = $ref([new Date(2022, 0, 2, 0, 30), new Date(2022, 0, 2, 23, 30)])
</script>

<template>
    <DateRangeDirectPicker v-model="timeRange" />
</template>

<style>
#app {
    color: #2c3e50;
    margin-top: 60px;
}
</style>
