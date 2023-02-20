<template>
    <div
        class="time-range-slider__slider__point"
        :style="{
            '--position': position,
        }"
    >
        <div
            class="time-range-slider__slider__point__resizer"
            :data-resizer="side"
        />
    </div>
</template>
<script lang="ts" setup>
import { PointFixedSide } from './util'

const { position, side } = defineProps<{
    side: PointFixedSide
    position: number
}>()
</script>
