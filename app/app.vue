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
  .filter((route) => route.meta.title)
  .sort((a, b) => Number(a.meta.sort) - Number(b.meta.sort))
  .map((route) => ({ title: route.meta.title, to: route.path }));
const { data: userData } = await useFetch('/api/users/me');

const logout = () => {
  if (useUserSession().session.value?.loginProvider === 'USP') {
    window.location.href = './auth/usp?logout';
  } else {
    clear();
    router.push('/');
  }
};
</script>

<template>
  <NuxtLoadingIndicator color="blue" :height="2" />
  <v-app :theme="theme.value">
    <DisclaimerDialog />
    <v-app-bar class="d-print-none" color="green-darken-3" flat density="compact">
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
          <v-list-item
            :subtitle="
              userData?.loginProvider === 'AMA'
                ? `${userData.name} · ${userData.id}`
                : userData?.name
            "
          />
          <v-divider />
          <v-list-item class="text-medium-emphasis" link to="/account">Meine Konto</v-list-item>
          <v-list-item :append-icon="mdiLogout" class="text-medium-emphasis" @click="logout"
            >Abmelden</v-list-item
          >
        </v-list>
      </v-menu>
      <v-btn v-else variant="plain" to="/account" :icon="mdiAccountCircle" />
    </v-app-bar>
    <v-navigation-drawer v-model="drawer" class="d-print-none" :permanent="mdAndUp">
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
          <v-list-item :append-icon="mdiLogout" class="pl-6 text-medium-emphasis" @click="logout"
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

<style>
/* The scrollable v-main clips printouts to one viewport, and the hidden app bar and
   drawer still reserve space; let the content flow across pages at full width instead. */
@media print {
  html,
  body,
  .v-application {
    background: #fff !important;
  }
  .v-application__wrap {
    min-height: 0 !important;
  }
  .v-main,
  .v-main__scroller {
    position: static !important;
    display: block !important;
    height: auto !important;
    overflow: visible !important;
    padding: 0 !important;
  }
}
</style>
