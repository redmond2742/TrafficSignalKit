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


/**
 * Drop the JSON-LD that scripts/build-seo-html.mjs baked into the static HTML.
 *
 * @vueuse/head dedupes <meta> and <link rel=canonical> against tags it did not
 * create, but not <script type="application/ld+json">, so without this every
 * page carries two copies of every block once HeadManager mounts.
 */
document
  .querySelectorAll('script[data-seo-prerender]')
  .forEach((el) => el.remove());

app.mount('#app')


  
  
