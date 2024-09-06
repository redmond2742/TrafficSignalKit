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

// Composables
import { createApp } from 'vue'
import { createVuetify } from 'vuetify'


export default createVuetify({
    theme: {
      defaultTheme: 'dark'
    }
  })


const app = createApp(App)

registerPlugins(app)

app.use(router)
app.use(createPinia());


app.mount('#app')





  
  
