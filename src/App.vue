<template>
  <v-app>
    <div>
      <Header></Header>
      <v-row>
        <v-col md="1" xs="0"></v-col>
      </v-row>
      <v-col>
        <router-view></router-view>
      </v-col>
      <v-row>
        <v-col md="1" xs="0"></v-col>
      </v-row>
      <Footer> </Footer>
    </div>
  </v-app>
</template>

<script setup>
import Header from './components/Header.vue'
import Footer from './components/Footer.vue'
import { useRoute } from 'vue-router'
import { useHead } from '@vueuse/head'

const route = useRoute()

useHead(() => ({
  title: route.meta.title || 'Traffic Signal Kit',
  meta: [
    {
      name: 'description',
      content: route.meta.description || 'Traffic Signal Kit tools',
    },
  ],
}))
</script>
<style></style>
