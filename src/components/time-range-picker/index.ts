import { default as TimeRangePicker } from './time-range-picker.vue'
import { default as DayBar } from './day-bar.vue'
import {default as DateTimeInput} from './date-time-input.vue'

const BundledComponent = TimeRangePicker as typeof TimeRangePicker & {
    DayBar: typeof DayBar
    DateTimeInput: typeof DateTimeInput
}

BundledComponent.DayBar = DayBar
BundledComponent.DateTimeInput = DateTimeInput

export default BundledComponent
