/**
 * @typedef {'light'|'dark'} Theme
 */

/**
 * @returns {{theme: Theme}}
 */
export const useBrowserTheme = () => {
  const { $ssrClientHints } = useNuxtApp();
  return {
    theme: $ssrClientHints.colorSchemeFromCookie === 'dark' ? 'dark' : 'light',
  };
};
