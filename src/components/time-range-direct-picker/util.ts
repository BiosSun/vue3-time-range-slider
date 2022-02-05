import { endOfMinute, isValid, startOfMinute } from 'date-fns'

export type TimeRange = (Date | undefined)[] | undefined

export function getStartTime(timeRange: TimeRange): Date | undefined {
    const time = timeRange?.[0]

    if (!time) {
        return undefined
    }

    if (!isValid(time)) {
        throw new Error('invalid start time in time range.')
    }

    return startOfMinute(time)
}

export function getEndTime(timeRange: TimeRange): Date | undefined {
    const time = timeRange?.[1]

    if (!time) {
        return undefined
    }

    if (!isValid(time)) {
        throw new Error('invalid end time in time range.')
    }

    return endOfMinute(time)
}
