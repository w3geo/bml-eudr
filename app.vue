<script setup>
useHead({
  titleTemplate: (titleChunk) =>
    titleChunk
      ? `${titleChunk} | EUDR Entwaldungsverordnung Tool`
      : 'EUDR Entwaldungsverordnung Tool',
});
const { theme } = useBrowserTheme();
const drawer = ref(false);
const router = useRouter();
const routes = router.getRoutes();
const items = routes.map((route) => ({ title: route.meta.title, to: route.path }));
</script>

<template>
  <v-app :theme="theme">
    <v-app-bar elevation="0" scroll-behavior="hide" scroll-threshold="50">
      <v-img max-height="50" max-width="200" :src="`/BML_Logo_srgb_${theme}.svg`" />
      <template #extension>
        <v-toolbar density="compact" color="green-darken-4">
          <template #prepend>
            <v-app-bar-nav-icon @click.stop="drawer = !drawer"></v-app-bar-nav-icon>
          </template>
          <v-app-bar-title
            ><NuxtLink class="text-decoration-none text-high-emphasis" to="/"
              >EUDR Entwaldungsverordnung Tool</NuxtLink
            ></v-app-bar-title
          >
          <v-btn variant="plain" to="/profile" icon="mdi-account-circle" />
        </v-toolbar>
      </template>
    </v-app-bar>
    <v-navigation-drawer v-model="drawer" location="left" max-width="200" temporary>
      <v-list-item v-for="item in items" :key="item.to" link :to="item.to">{{
        item.title
      }}</v-list-item>
    </v-navigation-drawer>
    <v-main>
      <NuxtPage />
    </v-main>
  </v-app>
</template>
