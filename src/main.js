/**
 * main.js
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */

// Plugins
import { registerPlugins } from '@/plugins'
import { createPinia } from 'pinia';
import { createHead } from '@vueuse/head';

// Components
import App from './App.vue'
import router from './router'

// Composables
import { createApp } from 'vue'


import 'vuetify/styles'; // Ensure you import the styles

// Site-wide styles. Imported last so it lands after vuetify/styles in the
// cascade - the same position these rules held when they were scattered across
// component <style> blocks.
import '@/styles/global.css';


const app = createApp(App)
const head = createHead();

registerPlugins(app)

app.use(router)
app.use(createPinia());
app.use(head);


app.mount('#app')


  
  
