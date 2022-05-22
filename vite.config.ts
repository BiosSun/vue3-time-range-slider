import path from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        vue({
            reactivityTransform: true,
        }),
    ],

    build: {
        lib: {
            entry: path.resolve(__dirname, 'src/components/time-range-slider/index.ts'),
            name: 'TimeRangeSlider',
            fileName: (format) => `index.${format}.js`,
        },
        rollupOptions: {
            // 确保外部化处理那些你不想打包进库的依赖
            external: ['vue', 'date-fns'],
            output: {
                // 在 UMD 构建模式下为这些外部化的依赖提供一个全局变量
                globals: {
                    vue: 'Vue',
                    'date-fns': 'DateFns',
                },
            },
        },
    },
})
