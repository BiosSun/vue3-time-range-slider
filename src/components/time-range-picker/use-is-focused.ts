import { onBeforeUnmount } from 'vue'

interface Options {
    onFocus?: () => void
    onBlur?: () => void
}

export default function useIsFocused(options: Options) {
    let isFocused = $ref(false)
    let isUnmounted = false
    let blurTimer = 0

    onBeforeUnmount(() => {
        isUnmounted = true
    })

    function onFocus() {
        if (blurTimer) {
            clearTimeout(blurTimer)
            blurTimer = 0
        }

        if (isFocused) {
            return
        }

        isFocused = true
        options?.onFocus?.()
    }

    function onBlur() {
        if (blurTimer) {
            clearTimeout(blurTimer)
        }

        blurTimer = setTimeout(() => {
            if (isUnmounted) {
                return
            }

            isFocused = false
            options?.onBlur?.()
        })
    }

    return {
        isFocused: $$(isFocused),
        onFocus,
        onBlur,
    }
}
