import { join } from 'node:path';
import { defineNuxtConfig } from 'nuxt/config';

if (!process.env.AMA_CATTLE_PATH) {
  console.log('AMA_CATTLE_PATH not set, not scheduling ama-cattle task');
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  sourcemap: {
    client: true,
    server: true,
  },
  modules: [
    '@nuxt/fonts',
    '@nuxt/eslint',
    'nuxt-auth-utils',
    'vuetify-nuxt-module',
    '@eschricht/nuxt-color-mode',
  ],
  runtimeConfig: {
    // See server/utils/database.js and server/plugins/storage.js
    pgliteDataDir: join('.data', 'pglite'),
    // See server/utils/nodemailer.js
    smtp: {
      from: '',
      host: '',
      port: 587,
      secure: false,
      user: '',
      pass: '',
    },
  },
  app: {
    head: {
      htmlAttrs: {
        lang: 'de',
      },
    },
  },
  colorMode: {
    preference: 'system',
    fallback: 'dark',
  },
  nitro: {
    experimental: {
      tasks: true,
    },
    scheduledTasks: process.env.AMA_CATTLE_PATH ? { '*/5 * * * *': ['ama-cattle'] } : {},
  },

  vite: {
    optimizeDeps: {
      include: ['@mdi/js', '@vue/devtools-core', '@vue/devtools-kit'],
    },
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
            colors: {
              'primary': '#11785F',
              'primary-darken-1': '#0D5946',
            },
          },
          dark: {
            dark: true,
            colors: {
              'primary': '#66BDA7',
              'primary-darken-1': '#43A38B',
            },
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
      prefixComposables: ['useLayout'],
    },
  },
});
