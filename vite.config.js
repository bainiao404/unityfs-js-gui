import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig(({ mode }) => {
    let outDir = 'dist'
    if (mode === 'web') {
        outDir = 'dist/web'
    } else if (mode === 'electron') {
        outDir = 'dist/electron/resources/app/dist'
    } else if (mode === 'cordova') {
        outDir = 'dist/cordova'
    }

    return {
        base: './',
        plugins: [
            vue(),
            vueDevTools(),
        ],
        optimizeDeps: {
            exclude: ['lz4-wasm'], // 避免 Vite 预构建时破坏 WASM 二进制文件
        },
        resolve: {
            alias: {
                '@': fileURLToPath(new URL('./src', import.meta.url)),
            },
        },
        build: {
            outDir: outDir,
            assetsDir: 'assetsVue',
            // 开启 source map 生产环境生成
            sourcemap: true,
        },
    }
})
