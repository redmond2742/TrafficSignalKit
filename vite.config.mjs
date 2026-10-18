// Plugins
import Components from 'unplugin-vue-components/vite'
import Vue from '@vitejs/plugin-vue'
import Vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'


// Utilities
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import { featuredPreloadTags } from './scripts/featuredPreload.mjs'



// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    Vue({
      template: { transformAssetUrls },
      
    }),
    // https://github.com/vuetifyjs/vuetify-loader/tree/master/packages/vite-plugin#readme
    Vuetify(),
    Components(),
    // Starts the featured cards' art with the script; see featuredPreload.mjs.
    // Build only: the dev server hands this HTML to every route, where the
    // browser warns about preloads the page never uses.
    { name: 'preload-featured-art', apply: 'build', transformIndexHtml: () => featuredPreloadTags() },
  ],
  // 111 console statements across src/. Dropping them at build time beats
  // editing every call site, and keeps them available in dev.
  esbuild: {
    drop: ['console', 'debugger'],
  },
  define: { 'process.env': {} },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
    extensions: [
      '.js',
      '.json',
      '.jsx',
      '.mjs',
      '.ts',
      '.tsx',
      '.vue',
    ],
  },
  server: {
    // 3000 unless a launcher assigns a port, as the desktop app's preview does
    // when 3000 is taken by another project's dev server.
    port: Number(process.env.PORT) || 3000,
    watch:{
      usePolling: true,
    },
    watchOptions: {
      poll: true
}
  },
})
