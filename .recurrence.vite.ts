import{defineConfig,mergeConfig}from'vite'
import base from'./vite.config.ts'
export default mergeConfig(base,defineConfig({cacheDir:'node_modules/.vite-shared-recurrence-1102'}))
