/// <reference types="vue/macros-global" />

declare module '*.vue' {
    import { DefineComponent } from 'vue'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
    const component: DefineComponent<{}, {}, any>
    export default component
}

declare module 'csstype' {
    interface Properties {
        '--start'?: number
        '--end'?: number
        '--position'?: number
    }
}
