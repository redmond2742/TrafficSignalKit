/**
 * plugins/vuetify.js
 *
 * Framework documentation: https://vuetifyjs.com`
 */

// Styles
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import { VNumberInput } from 'vuetify/labs/VNumberInput'



// Composables
import { createVuetify } from 'vuetify'



// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
export default createVuetify({
  components: {
    VNumberInput
  },
  /**
   * There was no theme block at all, so `primary` was Vuetify's stock blue
   * while the app bar hardcoded teal and the browser theme-color meta said
   * navy -- three different brand colours. One token now feeds all of them.
   *
   * Pinned to light: the dark theme ships with roughly a hundred hardcoded
   * light-mode hex values that do not follow it, so the toggle was removed
   * until that is worth doing properly.
   */
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        dark: false,
        colors: {
          primary: '#009688',
        },
      },
    },
  },
  icons: {
    defaultSet: 'mdi',
  },
})
