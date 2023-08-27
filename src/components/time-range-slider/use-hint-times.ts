import { format, startOfDay } from 'date-fns'
import { StepInfo, notNil } from './util'

export function useHintTimes() {
    let times = $ref<Date[]>([])
    let days = $computed(() => times.map((time) => startOfDay(time).valueOf()))

    let line = $ref(true)

    function set(...rawTimes: (Date | undefined)[]) {
        times = rawTimes.filter(notNil)
    }

    function getTimesByDay(dayTimeValue: number): Date[] | undefined {
        const sameDayTimes: Date[] = []

        days.forEach((day, index) => {
            if (day === dayTimeValue) {
                sameDayTimes.push(times[index])
            }
        })

        return sameDayTimes.length ? sameDayTimes : undefined
    }

    return {
        times,
        line,
        set,
        getTimesByDay,
    }
}

export function formatHintTimes(times: Date[] | undefined, step: StepInfo) {
    return times ? times.map((time) => format(time, step.tf)).join(' ~ ') : undefined
}
