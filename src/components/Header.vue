<template>
  <v-app-bar :elevation="12" color="primary">
    <v-app-bar-nav-icon
      v-if="mobileView"
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
      <v-dialog v-model="dialog" width="auto">
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
          <v-card-text>
            <iframe
              src="https://docs.google.com/forms/d/e/1FAIpQLSeVlfAjK6kn8hbWJ4YOzcekYtFDH9VLGGuNRMEJhp1HiYRT_A/viewform?embedded=true"
              width="640"
              height="1009"
              frameborder="0"
              marginheight="0"
              marginwidth="0"
              >Loading…</iframe
            >
          </v-card-text>
          <v-card-actions>
            <v-btn color="primary" block @click="dialog = false"
              >Close Dialog</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-dialog>
    </template>
  </v-app-bar>
  <v-navigation-drawer v-model="drawer" app temporary>
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
