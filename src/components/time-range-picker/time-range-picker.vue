<template>
    <div style="border: 1px solid #000; height: 390px; overflow: auto">
        <template v-for="date of dates" :key="date.valueOf()">
            <DayBar
                :date="date"
                :timeRange="currentTimeRange"
                :activated="activatedDayBar"
                @picking="onPicking"
                @picked="onPicked"
            />
        </template>
    </div>
</template>
<script lang="ts">
export default { name: 'TimeRangeDirectPicker' }
</script>
<script lang="ts" setup>
import { eachDayOfInterval } from 'date-fns'
import DayBar from './day-bar.vue'
import assert, {
    isTimeRange,
    PickingTimeRange,
    TimeRange,
    timeRangeToInterval,
    normalizeTimeRange,
} from './util'

const props = defineProps<{
    modelValue?: TimeRange
    pickerRange: TimeRange
}>()

const emit = defineEmits(['update:modelValue', 'change', 'startPicking', 'picking', 'endPicking'])

const dates = $computed(() => {
    return eachDayOfInterval(timeRangeToInterval(props.pickerRange))
})

type State = 'wait' | 'picking_start' | 'picked_start' | 'picking_end'
type Action = 'picking' | 'picked'

let state: State = $ref('wait')
let selectingTimeRange: PickingTimeRange | undefined = $ref(undefined)

const activatedDayBar = $computed(
    () => state === 'picking_start' || state === 'picked_start' || state === 'picking_end',
)

const currentTimeRange = $computed(() => {
    return normalizeTimeRange(selectingTimeRange ?? props.modelValue)
})

// 一个简单的状态机，处理与选择时间区间操作相关的所有交互逻辑
const STATE_ACTION_HANDLERS: {
    [state in State]: {
        [action in Action]: (time: Date | undefined) => State | void
    }
} = {
    wait: {
        picking(time: Date | undefined) {
            if (time) {
                selectingTimeRange = [time, undefined]
                emit('startPicking', selectingTimeRange)
                return 'picking_start'
            }
        },

        picked() {
            // 有时用户会在其它地方按下鼠标，并在 DayBar 组件上释放，此时会触发 picked 事件，这种情况直接忽略即可。
        },
    },

    picking_start: {
        picking(time: Date | undefined) {
            if (time) {
                selectingTimeRange = [time, undefined]
                emit('picking', selectingTimeRange)
            }
        },

        picked(time: Date | undefined) {
            if (time) {
                selectingTimeRange = [time, undefined]
            }
            emit('picking', selectingTimeRange)
            return 'picked_start'
        },
    },

    picked_start: {
        picking(time: Date | undefined) {
            if (time) {
                selectingTimeRange = [selectingTimeRange![0], time]
                emit('picking', selectingTimeRange)
                return 'picking_end'
            }
        },

        picked() {
            // 有时用户会在其它地方按下鼠标，并在 DayBar 组件上释放，此时会触发 picked 事件，这种情况直接忽略即可。
        },
    },

    picking_end: {
        picking(time: Date | undefined) {
            if (time) {
                selectingTimeRange = [selectingTimeRange![0], time]
                emit('picking', selectingTimeRange)
            }
        },

        picked(time: Date | undefined) {
            if (time) {
                selectingTimeRange = [selectingTimeRange![0], time]
            }

            assert(
                selectingTimeRange === undefined || isTimeRange(selectingTimeRange),
                'Invalid selecting time range',
            )

            emit('endPicking', selectingTimeRange)
            onModelValueChange(selectingTimeRange)
            selectingTimeRange = undefined
            return 'wait'
        },
    },
}

function onPicking(time: Date | undefined) {
    dispatch('picking', time)
}

function onPicked(time: Date | undefined) {
    dispatch('picked', time)
}

function onModelValueChange(timeRange: TimeRange | undefined) {
    emit('update:modelValue', timeRange)
    emit('change', timeRange)
}

function dispatch(action: Action, time: Date | undefined) {
    // const before = { state, selectingTimeRange }
    state = STATE_ACTION_HANDLERS[state as State][action](time) ?? state
    // console.info('dispatch', JSON.stringify(before), JSON.stringify({ state, selectingTimeRange }))
}
</script>
<style lang="scss" module></style>
