<script setup>
const { theme } = useBrowserTheme();
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtLoadingIndicator />
  <v-app :theme="theme">
    <v-app-bar elevation="0">
      <v-img max-height="50" max-width="200" :src="`/BML_Logo_srgb_${theme}.svg`" />
      <v-spacer />
      <v-btn to="./profile" icon="mdi-account-circle" />
    </v-app-bar>
    <v-app-bar density="compact" color="green-darken-4">
      <v-btn density="compact" variant="plain" icon="mdi-home" to="./" />
      <v-app-bar-title>EUDR Entwaldungsverordnung Tool</v-app-bar-title>
    </v-app-bar>
    <v-main>
      <NuxtPage />
    </v-main>
  </v-app>
</template>
