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
    devDatabase: {
      default: {
        connector: 'sqlite',
      },
    },
    database: {
      // See server/plugins/database.js
      default: {
        connector: 'postgresql',
        options: {
          url: process.env.DATABASE_URL,
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
