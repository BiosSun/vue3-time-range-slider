import {
    Interval,
    endOfMinute,
    isValid,
    startOfMinute,
    isDate,
    clamp as clampDate,
    subMilliseconds,
    addMilliseconds,
} from 'date-fns'

export type TimeRange = Date[]
export type PickingTimeRange = (Date | undefined)[]

export function isValidDate(date: any): date is Date {
    return isDate(date) && isValid(date)
}

export function isTimeRange(
    timeRange: TimeRange | PickingTimeRange | undefined,
): timeRange is TimeRange {
    return Array.isArray(timeRange) && isValid(timeRange[0]) && isValid(timeRange[1])
}

export function normalizeTimeRange(
    timeRange: TimeRange | PickingTimeRange | undefined,
): TimeRange | PickingTimeRange | undefined {
    if (!timeRange) {
        return undefined
    }

    const [start, end] = timeRange

    if (isValidDate(start)) {
        if (isValidDate(end)) {
            if (start!.valueOf() > end!.valueOf()) {
                return [end!, start]
            }

            return [start, end]
        }

        return [start, undefined]
    }

    if (isValidDate(end)) {
        return [end!, undefined]
    }

    return undefined
}

export function getStartTime(
    timeRange: TimeRange | PickingTimeRange | undefined,
): Date | undefined {
    const time = timeRange?.[0]

    if (!time) {
        return undefined
    }

    if (!isValid(time)) {
        throw new Error('invalid start time in time range.')
    }

    return startOfMinute(time)
}

export function getEndTime(timeRange: TimeRange | PickingTimeRange | undefined): Date | undefined {
    const time = timeRange?.[1]

    if (!time) {
        return undefined
    }

    if (!isValid(time)) {
        throw new Error('invalid end time in time range.')
    }

    return endOfMinute(time)
}

export function timeRangeToInterval(timeRange: TimeRange | PickingTimeRange): Interval {
    if (!Array.isArray(timeRange)) {
        throw new RangeError('Invalid time range')
    }

    return {
        start: timeRange[0]!,
        end: timeRange[1]!,
    }
}

export function clamp(val: number, min: number, max: number): number {
    return Math.min(Math.max(min, val), max)
}

/**
 * 确保一个时间值被限制在所指定的邻域区间内
 * NOTE: 这里的邻域是闭区间
 */
export function clampDateByClosedNeighbourhood(date: Date, point: Date, radius: number) {
    return clampDate(date, {
        start: subMilliseconds(point, radius),
        end: addMilliseconds(point, radius),
    })
}

export function assert(condition: unknown, message?: string): asserts condition {
    if (!condition) {
        throw new Error(message)
    }
}
