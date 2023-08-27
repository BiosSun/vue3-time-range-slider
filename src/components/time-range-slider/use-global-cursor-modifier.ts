import { onBeforeUnmount } from 'vue'

export function useGlobalCursorModifier() {
    let isSet = false
    let oldCursorBeforeSet: string = ''

    function set(cursor: string) {
        if (!isSet) {
            isSet = true
            oldCursorBeforeSet = document.body.style.getPropertyValue('cursor')
        }

        document.body.style.setProperty('cursor', cursor)
    }

    function reset() {
        if (isSet) {
            document.body.style.setProperty('cursor', oldCursorBeforeSet)
            isSet = false
        }
    }

    onBeforeUnmount(() => {
        reset()
    })

    return {
        set,
        reset,
    }
}
