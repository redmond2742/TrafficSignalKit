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

    <!--
      One block per desktop menu; the groups come from the tool registry.
      Traffic Signal Data holds 31 tools, so it opens as titled sections in
      columns rather than one list twice the height of the window.
    -->
    <template v-if="mobileViewHide">
      <div v-for="group in navGroups" :key="group.id" class="text-center">
        <v-menu>
          <template v-slot:activator="{ props }">
            <v-btn v-bind="props">{{ group.label }}</v-btn>
          </template>

          <v-list
            :density="group.sectioned ? 'compact' : undefined"
            :class="{ 'nav-columns': group.sectioned }"
          >
            <div
              v-for="(column, index) in group.columns"
              :key="index"
              class="nav-column"
            >
              <div
                v-for="section in column"
                :key="section.id"
                class="nav-section"
                :role="section.label ? 'group' : undefined"
                :aria-labelledby="section.label ? `nav-sec-${section.id}` : undefined"
              >
                <v-list-subheader
                  v-if="section.label"
                  :id="`nav-sec-${section.id}`"
                  class="nav-section__label"
                >
                  {{ section.label }}
                </v-list-subheader>
                <v-list-item
                  v-for="item in section.items"
                  :key="item.path"
                  :to="item.path"
                  link
                  active-class="nav-item-active"
                  class="nav-list-item"
                >
                  <v-list-item-title>{{ item.label }}</v-list-item-title>
                </v-list-item>
              </div>
            </div>
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
          <!--
            Was a red heart on its own, which reads as "like" or "donate". A
            phone keeps the icon alone, since the bar has no room for the word,
            and the drawer carries a labelled "Send feedback" too.
          -->
          <v-btn
            v-bind="props"
            variant="text"
            :icon="mobileView"
            :prepend-icon="mobileView ? undefined : 'mdi-message-text-outline'"
            aria-label="Send feedback"
          >
            <v-icon v-if="mobileView">mdi-message-text-outline</v-icon>
            <template v-else>Feedback</template>
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
  <!--
    The phone menu: the desktop's menus and sections as headings, left aligned,
    names wrapping rather than cut off, and a filter at the top. It used to be
    49 centred names in one list with nothing to group them.
  -->
  <v-navigation-drawer id="site-menu" v-model="drawer" temporary width="300">
    <nav ref="drawerNav" class="drawer-nav" tabindex="-1" aria-label="Site menu">
      <div class="drawer-search">
        <v-text-field
          v-model="drawerQuery"
          density="compact"
          variant="outlined"
          hide-details
          single-line
          clearable
          autocomplete="off"
          prepend-inner-icon="mdi-magnify"
          placeholder="Find a tool"
          aria-label="Find a tool in the menu"
          @keydown.enter="openFirstMatch"
        ></v-text-field>
      </div>

      <v-list density="compact" class="drawer-list">
        <template v-for="group in drawerGroups" :key="group.id">
          <div class="drawer-group">{{ group.label }}</div>
          <template v-for="section in group.sections" :key="section.id">
            <v-list-subheader v-if="section.label" class="drawer-section">
              {{ section.label }}
            </v-list-subheader>
            <v-list-item
              v-for="item in section.items"
              :key="item.path"
              :to="item.path"
              link
              active-class="nav-item-active"
              class="nav-list-item drawer-item"
              @click="drawer = false"
            >
              <v-list-item-title>{{ item.label }}</v-list-item-title>
            </v-list-item>
          </template>
        </template>
        <p v-if="!drawerGroups.length" class="drawer-empty">
          No tools match "{{ drawerQuery }}".
        </p>
      </v-list>

      <div class="drawer-foot">
        <v-btn
          variant="tonal"
          block
          prepend-icon="mdi-message-text-outline"
          @click="openFeedback"
        >
          Send feedback
        </v-btn>
      </div>
    </nav>
  </v-navigation-drawer>
</template>

<script>
import HeaderSearch from "./HeaderSearch.vue";
import {
  TOOLS,
  NAV_GROUPS,
  navSections,
  navLabel,
  matchTools,
} from "@/utils/toolRegistry.js";

export default {
  components: { HeaderSearch },
  data() {
    return {
      dialog: false,
      drawer: false, // Controls the drawer visibility
      drawerQuery: "",
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
        // The menu itself rather than the filter, so a phone does not throw
        // up its keyboard; Tab reaches the filter next.
        this.$nextTick(() => this.$refs.drawerNav?.focus());
      } else {
        window.removeEventListener("keydown", this.onDrawerKey);
        this.drawerQuery = "";
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
    /** Enter in the filter opens the first tool it left showing. */
    openFirstMatch() {
      const first = this.drawerGroups[0]?.sections[0]?.items[0];
      if (!first) return;
      this.drawer = false;
      this.$router.push(first.path);
    },
    openFeedback() {
      this.drawer = false;
      this.dialog = true;
    },
  },
  computed: {
    /** The menus and their sections, each already sorted, from the registry. */
    navGroups() {
      return NAV_GROUPS.map((group) => {
        const sections = navSections(TOOLS, group.id).map((section) => ({
          ...section,
          items: section.items.map((tool) => ({ path: tool.path, label: navLabel(tool) })),
        }));
        // Desktop columns; a menu without sections is a single one.
        const columns = [];
        for (const section of sections) {
          const at = (section.column || 1) - 1;
          (columns[at] = columns[at] || []).push(section);
        }
        return {
          ...group,
          sections,
          columns: columns.filter(Boolean),
          sectioned: sections.some((s) => s.label),
        };
      });
    },
    /**
     * The same menus for the drawer, cut down to what the filter matches.
     * The drawer used to be a hand-copy of the desktop menus, which is how GPX
     * Elevation ended up reachable on desktop and unreachable on a phone.
     */
    drawerGroups() {
      const query = (this.drawerQuery || "").trim();
      if (!query) return this.navGroups;
      const hits = new Set(matchTools(TOOLS, query).map((tool) => tool.path));
      return this.navGroups
        .map((group) => ({
          ...group,
          sections: group.sections
            .map((section) => ({
              ...section,
              items: section.items.filter((item) => hits.has(item.path)),
            }))
            .filter((section) => section.items.length),
        }))
        .filter((group) => group.sections.length);
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

/* Traffic Signal Data: sections in three columns, set in the registry. */
.nav-columns {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  column-gap: 8px;
  width: min(840px, 94vw);
  text-align: left;
}
.nav-section {
  padding-bottom: 6px;
}
.nav-columns :deep(.v-list-item) {
  min-height: 34px;
}
.nav-columns :deep(.v-list-subheader) {
  min-height: 34px;
}
/* wrap rather than cut a long name off */
.nav-columns :deep(.v-list-item-title) {
  white-space: normal;
  line-height: 1.3;
}
.nav-section__label {
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
  opacity: 1;
}

.drawer-nav {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  text-align: left;
  outline: none;
}
.drawer-search {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 12px 12px 8px;
  background: rgb(var(--v-theme-surface));
}
.drawer-list {
  flex: 1;
  padding-top: 0;
}
.drawer-group {
  margin: 14px 16px 2px;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.7);
}
.drawer-section {
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
  opacity: 1;
}
/* long names wrap instead of ending in "Hel…" */
.drawer-item :deep(.v-list-item-title) {
  white-space: normal;
  line-height: 1.3;
}
.drawer-empty {
  margin: 16px;
  color: rgba(var(--v-theme-on-surface), 0.7);
}
.drawer-foot {
  padding: 12px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}
</style>
