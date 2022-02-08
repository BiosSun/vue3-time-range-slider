import { default as TimeRangePicker } from './time-range-picker.vue'
import { default as DayBar } from './day-bar.vue'

const BundledComponent = TimeRangePicker as typeof TimeRangePicker & {
    DayBar: typeof DayBar
}

BundledComponent.DayBar = DayBar

export default BundledComponent
