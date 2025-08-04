/**
 * @param {import('vue-router').LocationQueryValue|Array<import('vue-router').LocationQueryValue>} onBehalfOfQueryParam
 * @param {import('vue-router').LocationQueryValue|Array<import('vue-router').LocationQueryValue>} tokenQueryParam
 * @returns {{ user: import('vue').Ref<import('~/server/db/schema/users').User|null>, reset: () => void }}
 */
export default function useOnBehalfOf(onBehalfOfQueryParam, tokenQueryParam) {
  /** @type {import('vue').Ref<import('~/server/db/schema/users').User|null>} */
  const user = useState('onBehalfOfUser', () => null);
  if (typeof onBehalfOfQueryParam === 'string' && typeof tokenQueryParam === 'string') {
    const queryParams = new URLSearchParams();
    queryParams.set('onBehalfOf', onBehalfOfQueryParam);
    queryParams.set('token', tokenQueryParam);
    useFetch(`/api/users/onBehalfOf?${queryParams.toString()}`).then(({ data }) => {
      user.value = data.value;
    });
  }
  return {
    user,
    reset: () => {
      user.value = null;
    },
  };
}
