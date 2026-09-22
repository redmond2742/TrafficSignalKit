// Plugins
import Components from 'unplugin-vue-components/vite'
import Vue from '@vitejs/plugin-vue'
import Vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
import ViteFonts from 'unplugin-fonts/vite'
import vitePluginFaviconsInject from 'vite-plugin-favicons-inject'
import { ViteFaviconsPlugin } from 'vite-plugin-favicon';


// Utilities
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'



// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // The plugin injects its own <meta name="theme-color"> near the top of
    // <head>, and the first one wins, so setting the colour here rather than
    // in index.html is what actually reaches the browser chrome.
    ViteFaviconsPlugin({
      logo: './src/assets/favicon-16x16.png',
      favicons: {
        background: '#ffffff',
        theme_color: '#009688',
      },
    }),
    Vue({
      template: { transformAssetUrls },
      
    }),
    // https://github.com/vuetifyjs/vuetify-loader/tree/master/packages/vite-plugin#readme
    Vuetify(),
    Components(),
    ViteFonts({
      google: {
        families: [{
          name: 'Roboto',
          styles: 'wght@100;300;400;500;700;900',
        }],
      },
    }),
  ],
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
    port: 3000,
    watch:{
      usePolling: true,
    },
    watchOptions: {
      poll: true
}
  },
})
