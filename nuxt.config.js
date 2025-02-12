import { join } from 'node:path';
import { defineNuxtConfig } from 'nuxt/config';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  sourcemap: {
    client: true,
    server: true,
  },
  modules: ['@nuxt/eslint', 'nuxt-auth-utils', 'vuetify-nuxt-module'],
  runtimeConfig: {
    // See server/utils/database.js and server/plugins/storage.js
    pgliteDataDir: join('.data', 'pglite'),
  },
  vuetify: {
    vuetifyOptions: {
      icons: {
        defaultSet: 'mdi-svg',
      },
      theme: {
        defaultTheme: 'dark',
        themes: {
          light: {
            dark: false,
          },
          dark: {
            dark: true,
          },
        },
      },
    },
    moduleOptions: {
      ssrClientHints: {
        prefersColorScheme: true,
        prefersColorSchemeOptions: {
          useBrowserThemeOnly: true,
        },
      },
    },
  },
});
