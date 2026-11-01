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
    '@nuxtjs/robots',
    '@nuxtjs/sitemap',
  ],
  // See https://nuxtseo.com/docs/site-config and README.md. Not indexable unless production sets
  // NUXT_SITE_INDEXABLE=true at build time.
  site: {
    name: 'EUDR Meldung',
    indexable: false,
  },
  robots: {
    disallow: ['/auth/'],
  },
  routeRules: {
    // noindex header and meta tag, and not in the sitemap
    '/api/**': { robots: false },
    '/auth/**': { robots: false },
    '/print/**': { robots: false },
    '/statement': { robots: false },
  },
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
    // See server/utils/brevo.js
    brevo: {
      apiKey: '',
      // Alphanumeric senders are limited to 11 characters
      smsSender: 'EUDRMeldung',
    },
    public: {
      // Self-hosted Umami, see app/app.vue. Only production sets these, so analytics are off
      // elsewhere.
      umami: {
        websiteId: '',
        scriptUrl: '',
      },
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
    scheduledTasks: {
      '30 3 * * *': ['statement-contents', 'users'],
      ...(process.env.AMA_CATTLE_PATH ? { '*/5 * * * *': ['ama-cattle'] } : {}),
    },
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
            variables: {
              // Vuetify's 0.6 makes field labels (0.87 × 0.6) fail the WCAG AA contrast of 4.5:1
              'medium-emphasis-opacity': 0.65,
            },
          },
          dark: {
            dark: true,
            colors: {
              'primary': '#66BDA7',
              'primary-darken-1': '#43A38B',
              // Vuetify's #CF6679 has a contrast of 4.47:1 on dark cards, WCAG AA requires 4.5:1
              'error': '#D46F80',
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
