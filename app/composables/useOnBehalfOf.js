/**
 * @param {import('vue-router').LocationQueryValue|Array<import('vue-router').LocationQueryValue> | undefined} onBehalfOfQueryParam
 * @param {import('vue-router').LocationQueryValue|Array<import('vue-router').LocationQueryValue> | undefined} tokenQueryParam
 * @returns {{ user: import('vue').Ref<import('~~/server/db/schema/users').User|null|undefined>, reset: () => void }}
 */
export default function useOnBehalfOf(onBehalfOfQueryParam, tokenQueryParam) {
  /** @type {import('vue').Ref<import('~~/server/db/schema/users').User|null|undefined>} */
  const user = useState('onBehalfOfUser', () => null);
  if (typeof onBehalfOfQueryParam === 'string' && typeof tokenQueryParam === 'string') {
    const queryParams = new URLSearchParams();
    queryParams.set('onBehalfOf', onBehalfOfQueryParam);
    queryParams.set('token', tokenQueryParam);
    useFetch(`/api/users/onBehalfOf?${queryParams.toString()}`, {
      deep: true,
    }).then(({ data }) => {
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
