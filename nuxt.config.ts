import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  sourcemap: {
    client: true,
    server: true,
  },
  modules: ['@nuxt/eslint', 'nuxt-auth-utils', 'vuetify-nuxt-module'],
  nitro: {
    database: {
      // See server/plugins/database.js
      default: {
        connector: 'pglite',
        options: {
          dataDir: join(__dirname, '.data', 'pglite'),
        },
      },
    },
    experimental: {
      database: true,
    },
  },
  vuetify: {
    vuetifyOptions: {
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
