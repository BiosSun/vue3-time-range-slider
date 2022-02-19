<template>
    <!-- WAIT: 改为使用 SVG -->
    <div class="r-time-range-direct-picker__time-ruler">
        <div class="r-time-range-direct-picker__time-ruler__scale"></div>
        <div class="r-time-range-direct-picker__time-ruler__scale"></div>
        <div class="r-time-range-direct-picker__time-ruler__scale">
            <span class="r-time-range-direct-picker__time-ruler__scale__label">03:00</span>
        </div>
        <div class="r-time-range-direct-picker__time-ruler__scale"></div>
        <div class="r-time-range-direct-picker__time-ruler__scale"></div>
        <div class="r-time-range-direct-picker__time-ruler__scale">
            <span class="r-time-range-direct-picker__time-ruler__scale__label">06:00</span>
        </div>
        <div class="r-time-range-direct-picker__time-ruler__scale"></div>
        <div class="r-time-range-direct-picker__time-ruler__scale"></div>
        <div class="r-time-range-direct-picker__time-ruler__scale">
            <span class="r-time-range-direct-picker__time-ruler__scale__label">09:00</span>
        </div>
        <div class="r-time-range-direct-picker__time-ruler__scale"></div>
        <div class="r-time-range-direct-picker__time-ruler__scale"></div>
        <div class="r-time-range-direct-picker__time-ruler__scale">
            <strong class="r-time-range-direct-picker__time-ruler__scale__label">12:00</strong>
        </div>
        <div class="r-time-range-direct-picker__time-ruler__scale"></div>
        <div class="r-time-range-direct-picker__time-ruler__scale"></div>
        <div class="r-time-range-direct-picker__time-ruler__scale">
            <span class="r-time-range-direct-picker__time-ruler__scale__label">15:00</span>
        </div>
        <div class="r-time-range-direct-picker__time-ruler__scale"></div>
        <div class="r-time-range-direct-picker__time-ruler__scale"></div>
        <div class="r-time-range-direct-picker__time-ruler__scale">
            <span class="r-time-range-direct-picker__time-ruler__scale__label">18:00</span>
        </div>
        <div class="r-time-range-direct-picker__time-ruler__scale"></div>
        <div class="r-time-range-direct-picker__time-ruler__scale"></div>
        <div class="r-time-range-direct-picker__time-ruler__scale">
            <span class="r-time-range-direct-picker__time-ruler__scale__label">21:00</span>
        </div>
        <div class="r-time-range-direct-picker__time-ruler__scale"></div>
        <div class="r-time-range-direct-picker__time-ruler__scale"></div>
    </div>
</template>
<script lang="ts" setup></script>
<style lang="scss">
.r-time-range-direct-picker__time-ruler {
    height: 13px;
    display: flex;
    align-items: stretch;
    justify-content: space-evenly;

    font-size: 12px;
    line-height: 12px;

    font-variant-numeric: tabular-nums;
    font-feature-settings: 'tnum';

    user-select: none;
    pointer-events: none;

    > {
        flex: 0 0 1px;
        max-width: 1px;
        min-width: 1px;
    }

    &__scale {
        position: relative;

        &:before {
            content: '';

            position: absolute;
            top: 9px;
            bottom: 0;
            left: 0;
            right: 0;

            width: 1px;

            background: currentColor;
        }

        &:empty {
            &:before {
                top: 10px;
                opacity: 0.5;
            }
        }

        &__label {
            position: absolute;
            left: 50%;
            top: 0;
            transform: translateX(-50%) scale(0.7);
            transform-origin: top center;
        }
    }
}
</style>
