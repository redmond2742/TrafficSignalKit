<template>
  <!--
    Lives in the app bar's existing 64px row, in the space the two v-spacers
    used to hold. It must not make the bar taller: `hide-details` is the prop
    that matters, because without it Vuetify renders a ~22px details slot under
    the field and the whole row grows.

    This is a v-text-field plus a manually controlled v-menu rather than a
    v-autocomplete. v-autocomplete swallows Enter and the arrow keys for its own
    selection model, which fought the "Enter with nothing highlighted goes to
    the full grid" behaviour, and it was not exposing combobox ARIA here either.
    Driving the list directly costs a few more lines and behaves predictably.
  -->
  <div :class="compact ? 'header-search-compact' : 'header-search'">
    <v-btn
      v-if="compact && !expanded"
      icon="mdi-magnify"
      variant="text"
      aria-label="Search tools"
      @click="openCompact"
    ></v-btn>

    <!--
      On a phone the bar is already full, so the field covers the title and nav
      rather than sitting beside them. Absolute inside the app bar, which is
      position:fixed and so already a containing block, leaving the bar at 64px.
    -->
    <div v-if="!compact || expanded" :class="expanded ? 'header-search-overlay' : null">
      <div id="header-search-anchor" class="header-search__anchor">
        <v-text-field
          ref="field"
          v-model="query"
          :autofocus="expanded"
          hide-details
          single-line
          clearable
          autocomplete="off"
          density="compact"
          variant="solo"
          rounded="pill"
          flat
          bg-color="rgba(255, 255, 255, 0.18)"
          base-color="white"
          color="white"
          prepend-inner-icon="mdi-magnify"
          placeholder="Search tools"
          aria-label="Search tools"
          aria-autocomplete="list"
          aria-controls="header-search-list"
          :aria-expanded="String(menuOpen)"
          :aria-activedescendant="activeDescendant"
          @update:model-value="onInput"
          @focus="onFocus"
          @keydown="onKeydown"
          @click:clear="closeMenu"
        >
          <template #append-inner>
            <kbd v-if="!query && !compact" class="header-search__kbd">/</kbd>
          </template>
        </v-text-field>
      </div>

      <v-btn
        v-if="expanded"
        icon="mdi-close"
        variant="text"
        aria-label="Close search"
        @click="closeCompact"
      ></v-btn>
    </div>

    <v-menu
      v-model="menuOpen"
      target="#header-search-anchor"
      location="bottom"
      :open-on-click="false"
      :open-on-focus="false"
      :close-on-content-click="true"
      max-height="420"
      offset="4"
    >
      <v-list id="header-search-list" density="compact" role="listbox">
        <v-list-item
          v-for="(row, index) in rows"
          :id="`header-search-opt-${index}`"
          :key="row.key"
          role="option"
          :aria-selected="String(index === highlight)"
          :active="index === highlight"
          :class="row.type === 'all' ? 'header-search__all' : null"
          @click="activate(row)"
          @mousemove="highlight = index"
        >
          <v-list-item-title>{{ row.title }}</v-list-item-title>
          <v-list-item-subtitle v-if="row.subtitle">{{ row.subtitle }}</v-list-item-subtitle>
        </v-list-item>

        <v-list-item v-if="!rows.length" disabled>
          <v-list-item-title>No tools match "{{ query }}"</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>
  </div>
</template>

<script>
import { TOOLS, matchTools } from "@/utils/toolRegistry.js";

/** How many tools the dropdown shows before deferring to the full grid. */
const MAX_SUGGESTIONS = 7;

export default {
  name: "HeaderSearch",
  data() {
    return {
      query: "",
      menuOpen: false,
      highlight: -1,
      expanded: false,
    };
  },
  computed: {
    compact() {
      return this.$vuetify.display.smAndDown;
    },
    matches() {
      return this.query ? matchTools(TOOLS, this.query) : [];
    },
    /**
     * The rows the user can actually move through, so the keyboard handler and
     * the rendered list can never disagree about what is at index n.
     */
    rows() {
      const rows = this.matches.slice(0, MAX_SUGGESTIONS).map((tool) => ({
        key: tool.path,
        type: "tool",
        title: tool.title,
        subtitle: tool.description,
        path: tool.path,
      }));
      // Only worth a row when the dropdown is actually hiding something.
      if (this.matches.length > rows.length) {
        rows.push({
          key: "__all__",
          type: "all",
          title: `See all ${this.matches.length} results for "${this.query}"`,
        });
      }
      return rows;
    },
    activeDescendant() {
      return this.highlight >= 0 ? `header-search-opt-${this.highlight}` : undefined;
    },
  },
  methods: {
    onInput(value) {
      this.highlight = -1;
      this.menuOpen = Boolean(value);
    },
    onFocus() {
      if (this.query) this.menuOpen = true;
    },
    onKeydown(event) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        if (!this.rows.length) return;
        event.preventDefault();
        this.menuOpen = true;
        const step = event.key === "ArrowDown" ? 1 : -1;
        const count = this.rows.length;
        this.highlight = (this.highlight + step + count) % count;
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        if (this.highlight >= 0 && this.rows[this.highlight]) {
          this.activate(this.rows[this.highlight]);
        } else {
          this.seeAll();
        }
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        if (this.menuOpen) this.closeMenu();
        else if (this.compact) this.closeCompact();
        else this.blurField();
      }
    },
    activate(row) {
      if (!row) return;
      if (row.type === "all") this.seeAll();
      else this.go(row.path);
    },
    /**
     * The fallback for a query with nothing highlighted. Also what implements
     * the ?q= SearchAction that index.html has advertised to search engines
     * without anything on the site honouring it.
     */
    seeAll() {
      const query = this.query;
      if (!query) return;
      this.reset();
      this.$router.push({ path: "/", query: { q: query } }).catch(() => {});
    },
    go(path) {
      this.reset();
      if (this.$route.path !== path) this.$router.push(path).catch(() => {});
    },
    reset() {
      this.query = "";
      this.highlight = -1;
      this.menuOpen = false;
      this.expanded = false;
      this.blurField();
    },
    closeMenu() {
      this.menuOpen = false;
      this.highlight = -1;
    },
    /**
     * Vuetify sends aria-* to the <input> but any `role` to the .v-field
     * wrapper, which would leave role="combobox" on one element and
     * aria-expanded on another. Put the role where the aria attributes and the
     * focus actually are.
     */
    syncInputRole() {
      const field = this.$refs.field;
      const input = field && field.$el && field.$el.querySelector("input");
      if (input) input.setAttribute("role", "combobox");
    },
    blurField() {
      const field = this.$refs.field;
      if (field && typeof field.blur === "function") field.blur();
    },
    openCompact() {
      this.expanded = true;
    },
    closeCompact() {
      this.query = "";
      this.menuOpen = false;
      this.highlight = -1;
      this.expanded = false;
    },
    focusField() {
      if (this.compact) {
        this.expanded = true;
        this.$nextTick(() => this.$refs.field && this.$refs.field.focus());
        return;
      }
      const field = this.$refs.field;
      if (field && typeof field.focus === "function") field.focus();
    },
    /**
     * Almost every tool on this site is a large CSV paste box, so a bare "/"
     * shortcut firing while someone types data would be a real problem. Bail
     * out whenever focus is already in an editable element.
     */
    onGlobalKeydown(event) {
      const el = document.activeElement;
      if (el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable)) return;

      const isSlash = event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey;
      const isCmdK = event.key.toLowerCase() === "k" && (event.ctrlKey || event.metaKey);
      if (!isSlash && !isCmdK) return;

      event.preventDefault();
      this.focusField();
    },
  },
  watch: {
    // the mobile field is created on demand, so the role has to be re-applied
    expanded: "syncInputRole",
    compact: "syncInputRole",
  },
  mounted() {
    window.addEventListener("keydown", this.onGlobalKeydown);
    this.syncInputRole();
  },
  updated() {
    this.syncInputRole();
  },
  beforeUnmount() {
    window.removeEventListener("keydown", this.onGlobalKeydown);
  },
};
</script>

<style scoped>
.header-search {
  max-width: 320px;
  width: 100%;
}
.header-search-compact {
  display: flex;
  align-items: center;
}
.header-search__anchor {
  width: 100%;
}
.header-search-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  /* Matches the app bar. Phase 4 swaps this for the primary theme token when
     the bar stops hardcoding its colour. */
  background-color: #009688;
}
.header-search__kbd {
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 4px;
  padding: 0 5px;
  font-size: 0.75rem;
  line-height: 1.4;
  opacity: 0.8;
}
.header-search__all {
  border-top: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
