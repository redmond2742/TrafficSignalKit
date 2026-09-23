/**
 * plugins/vuetify.js
 *
 * Framework documentation: https://vuetifyjs.com`
 */

// Styles
import 'vuetify/styles'
import { VNumberInput } from 'vuetify/labs/VNumberInput'

// Composables
import { h } from 'vue'
import { createVuetify } from 'vuetify'
import { VSvgIcon } from 'vuetify/components/VIcon'
import { aliases } from 'vuetify/iconsets/mdi-svg'
import {
  mdiArrowRight,
  mdiCircle,
  mdiClipboardTextOutline,
  mdiClose,
  mdiContentCopy,
  mdiFullscreen,
  mdiFullscreenExit,
  mdiGithub,
  mdiHeart,
  mdiLinkedin,
  mdiMagnify,
  mdiMap,
  mdiMapMarker,
  mdiMapMarkerDistance,
  mdiMinus,
  mdiPaperclip,
  mdiPause,
  mdiPlay,
  mdiPlus,
  mdiTrafficLight,
  mdiTrayArrowUp,
} from '@mdi/js'

/**
 * The 21 icons the site actually uses, as SVG paths.
 *
 * This replaces @mdi/font, which shipped all four webfont formats (3.3MB, of
 * which a browser uses one) plus a stylesheet declaring roughly 7,400 icon
 * classes. Every call site still writes icon="mdi-magnify", so nothing in the
 * views had to change: the set below resolves that name to its path.
 *
 * Adding an icon means importing it here. An unmapped name renders nothing,
 * which tests/icons.test.mjs turns into a failure rather than a blank square.
 */
export const ICONS = {
  'mdi-arrow-right': mdiArrowRight,
  'mdi-circle': mdiCircle,
  'mdi-clipboard-text-outline': mdiClipboardTextOutline,
  'mdi-close': mdiClose,
  'mdi-content-copy': mdiContentCopy,
  'mdi-fullscreen': mdiFullscreen,
  'mdi-fullscreen-exit': mdiFullscreenExit,
  'mdi-github': mdiGithub,
  'mdi-heart': mdiHeart,
  'mdi-linkedin': mdiLinkedin,
  'mdi-magnify': mdiMagnify,
  'mdi-map': mdiMap,
  'mdi-map-marker': mdiMapMarker,
  'mdi-map-marker-distance': mdiMapMarkerDistance,
  'mdi-minus': mdiMinus,
  'mdi-paperclip': mdiPaperclip,
  'mdi-pause': mdiPause,
  'mdi-play': mdiPlay,
  'mdi-plus': mdiPlus,
  'mdi-traffic-light': mdiTrafficLight,
  'mdi-tray-arrow-up': mdiTrayArrowUp,
}

const mdiSvgByName = {
  // A path passed straight through (Vuetify's own aliases do this) is left alone.
  component: (props) =>
    h(VSvgIcon, { ...props, icon: ICONS[props.icon] ?? props.icon }),
}



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
    // Vuetify's internal icons ($expand, $next, $close and friends) come from
    // the official svg aliases; ours come from the map above.
    aliases,
    sets: { mdi: mdiSvgByName },
  },
})
