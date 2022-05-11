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
    addSeconds,
    addMinutes,
    addHours,
    startOfSecond,
    endOfSecond,
    subSeconds,
    startOfMinute,
    endOfMinute,
    subMinutes,
    startOfHour,
    endOfHour,
    subHours,
} from 'date-fns'
import { markRaw } from 'vue'

export const M_MS = 1000 * 60
export const D_M = 60 * 24
export const D_MS = M_MS * D_M

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

export function isLateTime(t1: Date | undefined, t2: Date | undefined): boolean {
    return !!(t1 && t2 && t1.valueOf() > t2.valueOf())
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
 * 确保一个时间值被限制在所指定的起止区间或邻域区间内
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

// Step
// -----------------------------------------------------------------------------

export type SliderStep = 'second' | 'minute' | 'hour'

export interface StepInfo {
    key: SliderStep
    s: number
    ms: number
    tf: string // time's format template
    floor: <V extends Date | undefined>(time: V) => V extends Date ? Date : undefined
    ceil: <V extends Date | undefined>(time: V) => V extends Date ? Date : undefined
    prev: <V extends Date | undefined>(time: V) => V extends Date ? Date : undefined
    next: <V extends Date | undefined>(time: V) => V extends Date ? Date : undefined
}

export const STEP_INFOS: { [key in SliderStep]: StepInfo } = {
    second: markRaw({
        key: 'second',
        s: 1,
        ms: 1000,
        tf: 'HH:mm:ss',
        floor: (time) => (time ? startOfSecond(time) : undefined) as any,
        ceil: (time) => (time ? endOfSecond(time) : undefined) as any,
        prev: (time) => (time ? subSeconds(time, 1) : undefined) as any,
        next: (time) => (time ? addSeconds(time, 1) : undefined) as any,
    }),
    minute: markRaw({
        key: 'minute',
        s: 60,
        ms: 60000,
        tf: 'HH:mm',
        floor: (time) => (time ? startOfMinute(time) : undefined) as any,
        ceil: (time) => (time ? endOfMinute(time) : undefined) as any,
        prev: (time) => (time ? subMinutes(time, 1) : undefined) as any,
        next: (time) => (time ? addMinutes(time, 1) : undefined) as any,
    }),
    hour: markRaw({
        key: 'hour',
        s: 3600,
        ms: 3600000,
        tf: 'HH:mm',
        floor: (time) => (time ? startOfHour(time) : undefined) as any,
        ceil: (time) => (time ? endOfHour(time) : undefined) as any,
        prev: (time) => (time ? subHours(time, 1) : undefined) as any,
        next: (time) => (time ? addHours(time, 1) : undefined) as any,
    }),
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
    return isValidRange(range) && isValidTime(range[0]) && isValidTime(range[1])
}

export function isEmptyRange(range: Range): boolean {
    return range == null || (range[0] == null && range[1] == null)
}

export function isSameRange(r1: Range, r2: Range): boolean {
    const nr1 = normalizeRange(r1)
    const nr2 = normalizeRange(r2)
    return isSameTime(nr1[0], nr2[0]) && isSameTime(nr1[1], nr2[1])
}

export function diffRange(r1: Range, r2: Range): { start: boolean; end: boolean } {
    const nr1 = normalizeRange(r1)
    const nr2 = normalizeRange(r2)

    return {
        start: isSameTime(nr1[0], nr2[0]),
        end: isSameTime(nr1[1], nr2[1]),
    }
}

export function checkMovedPoint(r1: Range, r2: Range): 'start' | 'end' | undefined {
    let [r1l, r1r] = r1
    let [r2l, r2r] = r2

    if (isSameTime(r1l, r2r) || isSameTime(r1r, r2l)) {
        ;[r2r, r2l] = [r2l, r2r]
    }

    if (isSameTime(r1l, r2l)) {
        if (isSameTime(r1r, r2r)) {
            return undefined
        }

        return isLateTime(r2r, r2l) ? 'end' : 'start'
    } else {
        if (!isSameTime(r1r, r2r)) {
            return 'end'
        }

        return isLateTime(r2l, r2r) ? 'end' : 'start'
    }
}

/**
 * 确保所返回的时间区间中：
 * 1. 如果有两个时间点，则左时间点一定小于或等于右时间点；
 * 2. 如果只有一个时间点，则一定是左时间点，而右时间点为 undefined；
 * 3. 所有时间点一定是有效时间。
 */
export function normalizeRange(range: Range): Range {
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

/**
 * 确保 r1 的方向与 r2 保持一致。
 * 即确保若 r2 的左时间为起始时间点，则 r1 的左时间也为起始时间点，若 r2 的左时间为结束时间点，则 r1 也一样。
 * 若 r1 的方向与 r2 一样，若 r2 为 undefined，则直接返回 r1 的原值。
 */
export function ensureSameDirection(r1: Range, r2: Range): Range {
    // 检查时间区间中的左时间是否是起始时间点
    function isLeftStart(range: Range): boolean {
        return !!(!range[1] || (range[0] && range[0] <= range[1]))
    }

    if (
        !isValidRange(r1) ||
        !isValidRange(r2) ||
        isSameTime(r1[0], r1[1]) ||
        isSameTime(r2[0], r2[1])
    ) {
        return r1
    }

    const isSameDirection = isLeftStart(r1) === isLeftStart(r2)
    return isSameDirection ? r1 : [r1[1], r1[0]]
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

export function getRangeDuration(range: Range, step: StepInfo): number {
    assert(isFullRange(range), 'must full range to get duration')

    let p1 = range[0]
    let p2 = range[1]

    if (p1 > p2) {
        ;[p1, p2] = [p2, p1]
    }

    p1 = step.floor(p1)
    p2 = step.floor(step.next(p2))

    return p2.valueOf() - p1.valueOf()
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

export function clampIndex(val: number, len: number): number {
    return clamp(Math.floor(val), 0, len - 1)
}

export function assert(condition: unknown, message?: string): asserts condition {
    if (!condition) {
        throw new Error(message)
    }
}

/** 检查鼠标左键是否被按下 */
export function detectLeftButton(event: MouseEvent) {
    return !!(event.buttons & 0b1)
}
