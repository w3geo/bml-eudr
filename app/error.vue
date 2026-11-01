<script setup>
import { mdiArrowLeft } from '@mdi/js';

const props = defineProps({
  error: {
    type: /** @type {import('vue').PropType<import('#app').NuxtError>} */ (Object),
    required: true,
  },
});

const is404 = computed(() => props.error.statusCode === 404);
useSeoMeta({
  title: computed(() => (is404.value ? 'Nicht gefunden' : 'Fehler')),
});
useHead({
  titleTemplate: (titleChunk) => (titleChunk ? `${titleChunk} | EUDR Meldung` : 'EUDR Meldung'),
});

const theme = useColorMode();

// Messages from the API are German; Nuxt's own (e.g. "Page not found: /foo") are not shown.
const message = computed(() =>
  is404.value
    ? props.error.message && !props.error.message.startsWith('Page not found')
      ? props.error.message
      : 'Die angeforderte Seite wurde nicht gefunden.'
    : 'Es ist ein unerwarteter Fehler aufgetreten. Bitte versuchen Sie es später erneut.',
);

const goHome = () => clearError({ redirect: '/' });
</script>

<template>
  <v-app :theme="theme.value">
    <v-app-bar color="green-darken-3" flat density="compact">
      <v-app-bar-title>
        <a
          class="d-flex fit-content align-center ga-2 text-decoration-none text-white"
          href="/"
          @click.prevent="goHome"
        >
          <img src="/logo.png" alt="" height="28" width="34" />
          EUDR Meldung
        </a>
      </v-app-bar-title>
    </v-app-bar>
    <v-main id="main">
      <v-container class="text-center py-16" style="max-width: 40rem">
        <p class="text-h2 text-medium-emphasis mb-2">{{ error.statusCode }}</p>
        <h1 class="text-h5 mb-4">{{ is404 ? 'Nicht gefunden' : 'Fehler' }}</h1>
        <p class="mb-8">{{ message }}</p>
        <v-btn :prepend-icon="mdiArrowLeft" color="primary" @click="goHome"> Zur Startseite </v-btn>
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
.fit-content {
  width: fit-content;
}
</style>
