import {
    Interval,
    isValid,
    isDate,
    isSameDay as _isSameDay,
    max as maxDate,
    subMilliseconds,
    addMilliseconds,
    startOfDay,
    differenceInMilliseconds,
} from 'date-fns'

// Date
// -----------------------------------------------------------------------------

export function isTime(time: any): time is Date {
    return isDate(time)
}

export function isValidTime(time: any): time is Date {
    return isDate(time) && isValid(time)
}

export function isValidOptionalTime(time: any): time is Date | undefined {
    return time == null || isValidTime(time)
}

export function isSameTime(t1: Date | undefined, t2: Date | undefined): boolean {
    return (t1 == null && t2 == null) || t1?.valueOf() === t2?.valueOf()
}

export function isSameDay(t1: Date | undefined, t2: Date | undefined): boolean {
    return (t1 == null && t2 == null) || _isSameDay(t1!, t2!)
}

export function mergeDateAndTime(date: Date | undefined, time: Date | undefined) {
    try {
        const dateTime = addMilliseconds(startOfDay(date!), millisecondsOfDayStart(time!))
        return isValid(dateTime) ? dateTime : undefined
    } catch {
        return undefined
    }
}

function millisecondsOfDayStart(time: Date) {
    return differenceInMilliseconds(time!, startOfDay(time!))
}

/**
 * 确保一个时间值被限制在所指定的邻域区间内
 * NOTE: 这里的邻域是闭区间
 */
export function clampTime(time: Date, start: Date | undefined, end: Date | undefined): Date
export function clampTime(time: Date, center: Date, radius: number): Date
export function clampTime(time: Date, a: Date | undefined, b: Date | number | undefined): Date {
    let start: Date | undefined = undefined
    let end: Date | undefined = undefined

    // startTime and endTime
    if (b == null || isTime(b)) {
        if (a) {
            assert(isValid(a), 'Invalid start time')
            start = a
        }

        if (b) {
            assert(isValid(b), 'Invalid end time')
            end = b
        }
    }
    // centerTime and radius
    else {
        assert(a && isValid(a), 'Invalid center time')
        start = subMilliseconds(a, b)
        end = addMilliseconds(a, b)
        assert(isValid(start), 'Invalid radius')
        assert(isValid(end), 'Invalid radius')
    }

    if (start && time < start) {
        return start
    }

    if (end && time > end) {
        return end
    }

    return time
}

// Range
// -----------------------------------------------------------------------------

/**
 * 表示一个时间区间，其中包含两个可能未定义的 Date 类型的时间点。
 *
 * **NOTE:**
 *
 * 在 Range 类型中，时间点并不一定是按序的（即有可能第 1 个时间点是结束时间，而第 2 个时间点是起始时间），
 * 因此，我们定义了两套时间点的名称：
 *
 * - leftPoint: 区间中第一个时间点
 * - rightPoint: 区间中第二个时间点
 * - startPoint: 区间中的超始时间点
 * - endPoint: 区间中的结束时间点
 *
 * 另外若区间中只有一个有效时间点，则该时间点为 startPoint，而 endPoint 则会是 undefined。
 */
export type Range = (Date | undefined)[]

export function isValidRange(range: any): range is Range {
    return Array.isArray(range) && isValidOptionalTime(range[0]) && isValidOptionalTime(range[1])
}

export function isFullRange(range: any): range is Date[] {
    return isValidRange(range) && !!(range[0] && range[1])
}

export function isEmptyRange(range: Range | undefined): boolean {
    return range == null || (range[0] == null && range[1] == null)
}

export function normalizeRange(range: Range | undefined): Range {
    if (!range) {
        return [undefined, undefined]
    }

    const [start, end] = range

    if (isValidTime(start)) {
        if (isValidTime(end)) {
            if (start > end) {
                return [end!, start]
            }

            return [start, end]
        }

        return [start, undefined]
    }

    if (isValidTime(end)) {
        return [end!, undefined]
    }

    return [undefined, undefined]
}

export function getStartPoint(range: Range | undefined): Date | undefined {
    return !isValidRange(range)
        ? undefined
        : !range[0]
        ? range[1]
        : !range[1]
        ? range[0]
        : range[0] <= range[1]
        ? range[0]
        : range[1]
}

export function getEndPoint(range: Range | undefined): Date | undefined {
    return isFullRange(range) ? maxDate(range) : undefined
}

export function getLeftPoint(range: Range | undefined): Date | undefined {
    return range?.[0]
}

export function getRightPoint(range: Range | undefined): Date | undefined {
    return range?.[1]
}

export function rangeToInterval(range: Range): Interval | undefined {
    if (!isValidRange(range)) {
        return undefined
    }

    return {
        start: getStartPoint(range)!,
        end: getEndPoint(range)!,
    }
}

// Other
// -----------------------------------------------------------------------------

export function intersection(r1: Interval, r2: Interval): Interval | undefined {
    const { start: r1s, end: r1e } = r1
    const { start: r2s, end: r2e } = r2

    const start = r1s < r2s ? r2s : r1s
    const end = r1e > r2e ? r2e : r1e

    if (start > end) {
        return undefined
    }

    return { start, end }
}

export function clamp(val: number, min: number, max: number): number {
    return Math.min(Math.max(min, val), max)
}

export function assert(condition: unknown, message?: string): asserts condition {
    if (!condition) {
        throw new Error(message)
    }
}
