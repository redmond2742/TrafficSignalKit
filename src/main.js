/**
 * main.js
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */

// Plugins
import { registerPlugins } from '@/plugins'
import { createPinia } from 'pinia';

// Components
import App from './App.vue'
import router from './router'
import { createHead } from '@vueuse/head'

// Composables
import { createApp } from 'vue'
import { createVuetify } from 'vuetify'


import 'vuetify/styles'; // Ensure you import the styles
import { aliases, mdi } from 'vuetify/iconsets/mdi';


export default createVuetify({
  theme: {
    defaultTheme: 'light', // Default theme
    themes: {
      light: {
        dark: false,
      },
      dark: {
        dark: true,
      },
    },
  },
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi,
    },
  },
  })


const app = createApp(App)

const head = createHead()

registerPlugins(app)

app.use(router)
app.use(head)
app.use(createPinia());


app.mount('#app')





  
  
