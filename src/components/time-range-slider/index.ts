import { default as TimeRangeSlider } from './time-range-slider.vue'
import { default as SliderBar } from './slider-bar.vue'
import { default as DateTimeInput } from './date-time-input.vue'

import './index.scss'

const BundledComponent = TimeRangeSlider as typeof TimeRangeSlider & {
    SliderBar: typeof SliderBar
    DateTimeInput: typeof DateTimeInput
}

BundledComponent.SliderBar = SliderBar
BundledComponent.DateTimeInput = DateTimeInput

export default BundledComponent
