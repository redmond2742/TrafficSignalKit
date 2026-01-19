/**
 * main.ssg.js
 *
 * Entry for Vite SSG with client-side hydration.
 */

import { ViteSSG } from 'vite-ssg'
import { createHead } from '@vueuse/head'
import { createPinia } from 'pinia'

import App from './App.vue'
import { registerPlugins } from '@/plugins'
import { routes } from './router'

export const createApp = ViteSSG(App, { routes }, ({ app }) => {
  const head = createHead()

  registerPlugins(app)
  app.use(createPinia())
  app.use(head)
})
