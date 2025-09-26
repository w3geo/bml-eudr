<script setup>
import { mdiAccountCircle } from '@mdi/js';
import DisclaimerDialog from './components/DisclaimerDialog.vue';

useHead({
  titleTemplate: (titleChunk) => (titleChunk ? `${titleChunk} | EUDR Meldung` : 'EUDR Meldung'),
});
const theme = useColorMode();
const { mdAndUp } = useDisplay();
const { user } = useUserSession();
const drawer = ref(false);
const router = useRouter();
const routes = router.getRoutes();
const items = routes
  .sort((a, b) => Number(a.meta.sort) - Number(b.meta.sort))
  .map((route) => ({ title: route.meta.title, to: route.path }));
</script>

<template>
  <NuxtLoadingIndicator color="blue" :height="2" />
  <v-app :theme="theme.value" class="pb-12">
    <DisclaimerDialog />
    <!-- class="pb-12" is a workaround for the scroll bounce issue https://github.com/vuetifyjs/vuetify/issues/19090 -->
    <v-app-bar elevation="0" scroll-behavior="hide" scroll-threshold="48">
      <NuxtLink to="https://bmluk.gv.at/" target="_blank">
        <v-img width="199" height="63" :src="`/BMLUK_Logo_${theme.value}.svg`" />
      </NuxtLink>
      <template #extension>
        <v-toolbar density="compact" color="green-darken-4">
          <template #prepend>
            <v-app-bar-nav-icon @click.stop="drawer = !drawer"></v-app-bar-nav-icon>
          </template>
          <v-app-bar-title>
            <NuxtLink class="text-decoration-none text-grey-lighten-2" to="/">
              EUDR Meldung
            </NuxtLink>
          </v-app-bar-title>
          <v-btn
            variant="plain"
            to="/account"
            :icon="!user?.login ? mdiAccountCircle : undefined"
            :append-icon="user?.login ? mdiAccountCircle : undefined"
            :text="user?.login"
          />
        </v-toolbar>
      </template>
    </v-app-bar>
    <v-navigation-drawer v-model="drawer" max-width="200" :permanent="mdAndUp">
      <v-list density="compact">
        <v-list-item v-for="item in items" :key="item.to" link :to="item.to">
          {{ item.title }}
        </v-list-item>
        <v-list-item link href="mailto:service.entwaldung@bmluk.gv.at">Kontakt</v-list-item>
        <v-list-item link href="https://www.bmluk.gv.at/impressum.html">Impressum</v-list-item>
      </v-list>
    </v-navigation-drawer>
    <v-main>
      <NuxtPage />
    </v-main>
  </v-app>
</template>
