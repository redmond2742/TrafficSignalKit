<template>
  <v-app-bar :elevation="12" color="primary">
    <v-app-bar-nav-icon
      v-if="mobileView"
      ref="menuButton"
      :aria-label="drawer ? 'Close menu' : 'Open menu'"
      :aria-expanded="drawer ? 'true' : 'false'"
      aria-controls="site-menu"
      @click="drawer = !drawer"
    ></v-app-bar-nav-icon>
    <div class="title-justify">
      <v-app-bar-title>
        <router-link to="/"
          ><b>Traffic Signal Kit</b>
        </router-link></v-app-bar-title
      >
    </div>

    <!-- One block per desktop menu; the groups come from the tool registry. -->
    <template v-if="mobileViewHide">
      <div v-for="group in navGroups" :key="group.id" class="text-center">
        <v-menu>
          <template v-slot:activator="{ props }">
            <v-btn v-bind="props">{{ group.label }}</v-btn>
          </template>

          <v-list>
            <v-list-item
              v-for="item in group.items"
              :key="item.path"
              :to="item.path"
              link
              active-class="nav-item-active"
              class="nav-list-item"
            >
              <v-list-item-title>{{ item.label }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
    </template>

    <v-spacer></v-spacer>

    <!--
      The search field sits in the row's existing space (two v-spacers used to
      hold ~340px of nothing at 1280px). It must not make the bar taller; see
      HeaderSearch.vue.
    -->
    <HeaderSearch />

    <template v-slot:append>
      <!--
        The form used to sit in a fixed 640px frame with its only close button
        below 1,009px of form, so on a phone it ran off the right edge and the
        way out was a long scroll away. It now fits the screen, scrolls inside
        itself, and closes from the top (or with Escape).
      -->
      <v-dialog v-model="dialog" max-width="700">
        <template v-slot:activator="{ props }">
          <v-btn
            v-bind="props"
            size="large"
            variant="plain"
            aria-label="Send feedback"
          >
            <v-icon class="heart-icon">mdi-heart</v-icon>
          </v-btn>
        </template>
        <v-card>
          <div class="feedback-head">
            <span class="feedback-title">Send feedback</span>
            <v-btn
              icon="mdi-close"
              variant="text"
              size="small"
              aria-label="Close feedback"
              @click="dialog = false"
            ></v-btn>
          </div>
          <iframe
            class="feedback-frame"
            title="Feedback form"
            src="https://docs.google.com/forms/d/e/1FAIpQLSeVlfAjK6kn8hbWJ4YOzcekYtFDH9VLGGuNRMEJhp1HiYRT_A/viewform?embedded=true"
            >Loading…</iframe
          >
        </v-card>
      </v-dialog>
    </template>
  </v-app-bar>
  <v-navigation-drawer id="site-menu" v-model="drawer" app temporary>
    <v-list>
      <v-list-item
        v-for="item in drawerItems"
        :key="item.path"
        :to="item.path"
        link
        active-class="nav-item-active"
        class="nav-list-item"
        @click="drawer = false"
      >
        <v-list-item-title>{{ item.label }}</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-navigation-drawer>
</template>

<script>
import HeaderSearch from "./HeaderSearch.vue";
import {
  TOOLS,
  NAV_GROUPS,
  toolsInGroup,
  navLabel,
} from "@/utils/toolRegistry.js";

export default {
  components: { HeaderSearch },
  data() {
    return {
      dialog: false,
      drawer: false, // Controls the drawer visibility
    };
  },
  watch: {
    /**
     * A temporary drawer does not close on Escape by itself, and nothing moved
     * focus into it, so a keyboard user who opened it was stuck behind it.
     */
    drawer(open) {
      if (open) {
        window.addEventListener("keydown", this.onDrawerKey);
        this.$nextTick(() => {
          const first = document.querySelector("#site-menu a, #site-menu button");
          if (first) first.focus();
        });
      } else {
        window.removeEventListener("keydown", this.onDrawerKey);
      }
    },
  },
  beforeUnmount() {
    window.removeEventListener("keydown", this.onDrawerKey);
  },
  methods: {
    onDrawerKey(event) {
      if (event.key !== "Escape") return;
      this.drawer = false;
      this.$nextTick(() => this.$refs.menuButton?.$el?.focus());
    },
  },
  computed: {
    /** The desktop menus, each already sorted, straight from the registry. */
    navGroups() {
      return NAV_GROUPS.map((group) => ({
        ...group,
        items: toolsInGroup(TOOLS, group.id).map((tool) => ({
          path: tool.path,
          label: navLabel(tool),
        })),
      }));
    },
    /**
     * The mobile drawer is one flat list. It used to be a hand-copy of the four
     * desktop menus, which is how GPX Elevation ended up reachable on desktop
     * and unreachable on a phone.
     */
    drawerItems() {
      return this.navGroups.flatMap((group) => group.items);
    },
    mobileView() {
      return this.$vuetify.display.smAndDown;
    },
    mobileViewHide() {
      return !this.$vuetify.display.smAndDown;
    },
  },
};
</script>

<style scoped>
.heart-icon {
  color: rgb(235, 8, 8);
}
.feedback-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 8px 8px 20px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}
.feedback-title {
  font-weight: 600;
}
.feedback-frame {
  display: block;
  width: 100%;
  /* the form scrolls inside its own frame */
  height: min(1009px, 75vh);
  border: 0;
}
a {
  text-decoration: none;
  color: inherit;
}
.beta {
  font-size: 10px;
  color: red;
  vertical-align: super;
  font-weight: bold;
}
.center-items {
  display: flex;
  justify-content: center;
}
.title-justify {
  justify-content: flex-start;
  margin-left: 10px;
}
:deep(.nav-item-active) {
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}
:deep(.nav-list-item:focus-visible) {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}
</style>
