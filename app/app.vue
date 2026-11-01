<script setup>
import { mdiAccountCircle, mdiLogout } from '@mdi/js';

useHead({
  titleTemplate: (titleChunk) => (titleChunk ? `${titleChunk} | EUDR Meldung` : 'EUDR Meldung'),
});
// Canonical link and Open Graph tags for production. robots meta tags come from @nuxtjs/robots.
const route = useRoute();
const siteConfig = useSiteConfig();
if (siteConfig.indexable) {
  const canonicalUrl = computed(() => new URL(route.path, siteConfig.url).href);
  useHead({ link: [{ rel: 'canonical', href: canonicalUrl }] });
  useSeoMeta({
    ogSiteName: siteConfig.name,
    ogType: 'website',
    ogLocale: 'de_AT',
    ogUrl: canonicalUrl,
    ogImage: new URL('/logo.png', siteConfig.url).href,
  });
}
// Umami analytics, only where NUXT_PUBLIC_UMAMI_* is set (production). Proxied through
// server/routes/stats, which the script also sends its data to.
const { umami } = useRuntimeConfig().public;
if (umami.websiteId && umami.scriptUrl) {
  useHead({
    script: [{ 'src': '/stats/script.js', 'defer': true, 'data-website-id': umami.websiteId }],
  });
}
const theme = useColorMode();
const { mdAndUp } = useDisplay();
const { loggedIn } = useUserSession();
const { errorMessage, displayErrorMessage } = useErrorMessage();
const drawer = ref(false);
const router = useRouter();
const routes = router.getRoutes();
const items = routes
  .filter((route) => route.meta.title)
  .sort((a, b) => Number(a.meta.sort) - Number(b.meta.sort))
  .map((route) => ({ title: route.meta.title, to: route.path }));
const legalItems = [
  { title: 'Kontakt', href: 'mailto:service.entwaldung@bmluk.gv.at' },
  { title: 'Impressum', href: 'https://www.bmluk.gv.at/impressum.html' },
  { title: 'Datenschutz', to: '/privacy-statement' },
  { title: 'Barrierefreiheit', to: '/accessibility-statement' },
];
const { data: userData } = await useFetch('/api/users/me');

const logout = useLogout();
</script>

<template>
  <NuxtLoadingIndicator color="blue" :height="2" />
  <v-app :theme="theme.value">
    <a class="skip-link" href="#main">Zum Inhalt springen</a>
    <DisclaimerDialog />
    <v-app-bar class="d-print-none" color="green-darken-3" flat density="compact">
      <template #prepend>
        <v-app-bar-nav-icon
          aria-label="Menü"
          :aria-expanded="drawer"
          @click.stop="drawer = !drawer"
        ></v-app-bar-nav-icon>
      </template>
      <v-app-bar-title>
        <NuxtLink
          class="d-flex fit-content align-center ga-2 text-decoration-none text-white"
          to="/"
        >
          <img src="/logo.png" alt="" height="28" width="34" />
          EUDR Meldung
        </NuxtLink>
      </v-app-bar-title>
      <v-menu v-if="loggedIn">
        <template #activator="{ props }">
          <v-btn v-bind="props" variant="plain" :icon="mdiAccountCircle" aria-label="Konto" />
        </template>
        <v-list density="compact">
          <v-list-item
            :subtitle="
              userData?.loginProvider === 'AMA'
                ? `${userData.name} · ${userData.lfbis}`
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
      <v-btn v-else variant="plain" to="/account" :icon="mdiAccountCircle" aria-label="Anmelden" />
    </v-app-bar>
    <v-navigation-drawer v-model="drawer" class="d-print-none" :permanent="mdAndUp">
      <template #prepend>
        <NuxtLink class="d-block px-2" to="https://bmluk.gv.at/" target="_blank">
          <v-img
            width="199"
            height="63"
            :src="`/BMLUK_Logo_${theme.value}.svg`"
            alt="Bundesministerium für Land- und Forstwirtschaft, Klima- und Umweltschutz, Regionen und Wasserwirtschaft (öffnet in neuem Fenster)"
          />
        </NuxtLink>
        <v-divider class="mx-2" />
      </template>
      <!-- Vuetify makes lists an arrow key navigated widget: role="list" (which must not have links
           as direct children), the list in the tab order and its items not. Menus are expected to
           be navigated with tab instead. -->
      <v-list
        tag="nav"
        role="navigation"
        aria-label="Hauptmenü"
        tabindex="-1"
        nav
        slim
        density="compact"
      >
        <v-list-item
          v-for="item in items"
          :key="item.to"
          class="pl-6"
          tabindex="0"
          link
          :to="item.to"
        >
          {{ item.title }}
        </v-list-item>
        <template v-if="loggedIn">
          <v-list-item
            :append-icon="mdiLogout"
            class="pl-6 text-medium-emphasis"
            role="button"
            tabindex="0"
            @click="logout"
            >Abmelden</v-list-item
          ></template
        >
      </v-list>
      <template #append>
        <v-list
          tag="nav"
          role="navigation"
          aria-label="Service und Rechtliches"
          class="text-medium-emphasis"
          tabindex="-1"
          nav
          slim
          density="compact"
        >
          <v-list-item
            v-for="item in legalItems"
            :key="item.title"
            class="pl-6"
            tabindex="0"
            link
            v-bind="item.to ? { to: item.to } : { href: item.href }"
          >
            {{ item.title }}
          </v-list-item>
        </v-list>
      </template>
    </v-navigation-drawer>
    <v-main id="main" tabindex="-1" scrollable>
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
.fit-content {
  width: fit-content;
}
.skip-link {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 10000;
  padding: 8px 16px;
  border-radius: 4px;
  color: rgb(var(--v-theme-on-primary));
  background: rgb(var(--v-theme-primary));
  transform: translateY(-200%);
}
.skip-link:focus {
  transform: none;
}
#main:focus {
  outline: none;
}
</style>

<style>
/* Checkbox with a text label and a (?) help button: checkbox next to the first line of
   the label, help button next to the last. The 4px padding centers a 20px line on the
   28px checkbox. `.v-checkbox` is added to outrank Vuetify's own rules. */
.v-checkbox.checkbox-with-help .v-selection-control {
  align-items: flex-start;
  min-height: 0;
}
.v-checkbox.checkbox-with-help .v-label {
  overflow: visible;
}
.v-checkbox.checkbox-with-help .checkbox-with-help__text {
  flex: 1 1 auto;
  min-width: 0;
  padding-block: 4px;
}
.v-checkbox.checkbox-with-help .checkbox-with-help__help {
  align-self: flex-end;
  margin-top: -4px;
  margin-bottom: -2px;
}

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
