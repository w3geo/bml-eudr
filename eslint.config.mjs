import withNuxt from './.nuxt/eslint.config.mjs';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import pluginVue from 'eslint-plugin-vue';

export default withNuxt(eslintPluginPrettierRecommended, {
  rules: {
    'vue/html-self-closing': 'off',
    'vue/no-multiple-template-root': 'off',
  },
});
// Your custom configs here
