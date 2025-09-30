<script setup>
import { mdiAccountCircle, mdiLogout } from '@mdi/js';

useHead({
  titleTemplate: (titleChunk) => (titleChunk ? `${titleChunk} | EUDR Meldung` : 'EUDR Meldung'),
});
const theme = useColorMode();
const { mdAndUp } = useDisplay();
const { loggedIn, clear } = useUserSession();
const { errorMessage, displayErrorMessage } = useErrorMessage();
const drawer = ref(false);
const router = useRouter();
const routes = router.getRoutes();
const items = routes
  .sort((a, b) => Number(a.meta.sort) - Number(b.meta.sort))
  .map((route) => ({ title: route.meta.title, to: route.path }));
const { data: userData } = await useFetch('/api/users/me');
</script>

<template>
  <NuxtLoadingIndicator color="blue" :height="2" />
  <v-app :theme="theme.value">
    <DisclaimerDialog />
    <v-app-bar color="green-darken-3" flat density="compact">
      <template #prepend>
        <v-app-bar-nav-icon @click.stop="drawer = !drawer"></v-app-bar-nav-icon>
      </template>
      <v-app-bar-title>
        <NuxtLink class="text-decoration-none text-grey-lighten-2" to="/"> EUDR Meldung </NuxtLink>
      </v-app-bar-title>
      <v-menu v-if="loggedIn">
        <template #activator="{ props }">
          <v-btn v-bind="props" variant="plain" :icon="mdiAccountCircle" />
        </template>
        <v-list density="compact">
          <v-list-item :subtitle="userData?.name" />
          <v-divider />
          <v-list-item class="text-medium-emphasis" link to="/account">Meine Konto</v-list-item>
          <v-list-item
            :active="false"
            link
            to="/"
            :append-icon="mdiLogout"
            class="text-medium-emphasis"
            @click="clear"
            >Abmelden</v-list-item
          >
        </v-list>
      </v-menu>
      <v-btn v-else variant="plain" to="/account" :icon="mdiAccountCircle" />
    </v-app-bar>
    <v-navigation-drawer v-model="drawer" :permanent="mdAndUp">
      <v-list nav slim density="compact">
        <v-list-item class="pl-0 pt-0">
          <NuxtLink to="https://bmluk.gv.at/" target="_blank">
            <v-img width="199" height="63" :src="`/BMLUK_Logo_${theme.value}.svg`" />
          </NuxtLink>
        </v-list-item>
        <v-divider />
        <v-list-item v-for="item in items" :key="item.to" class="pl-6" link :to="item.to">
          {{ item.title }}
        </v-list-item>
        <v-list-item class="pl-6" link href="mailto:service.entwaldung@bmluk.gv.at"
          >Kontakt</v-list-item
        >
        <v-list-item class="pl-6" link href="https://www.bmluk.gv.at/impressum.html"
          >Impressum</v-list-item
        >
        <template v-if="loggedIn">
          <v-list-item
            :active="false"
            link
            to="/"
            :append-icon="mdiLogout"
            class="pl-6 text-medium-emphasis"
            @click="clear"
            >Abmelden</v-list-item
          ></template
        >
      </v-list>
    </v-navigation-drawer>
    <v-main scrollable>
      <NuxtPage />
    </v-main>
    <v-snackbar v-model="displayErrorMessage" color="warning" timeout="6000">
      <v-alert class="pa-0" density="compact" type="warning">{{ errorMessage }}</v-alert>
    </v-snackbar>
  </v-app>
</template>

<style scoped>
.inline-block {
  display: inline-block;
}
</style>
