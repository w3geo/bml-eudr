const onBehalfOf = ref();
const token = ref();
/** @type {import('vue').Ref<import('~/server/db/schema/users').User|null>} */
const user = ref(null);

function reset() {
  onBehalfOf.value = undefined;
  token.value = undefined;
  user.value = null;
}

watch([onBehalfOf, token], async ([newOnBehalfOf, newToken]) => {
  if (newOnBehalfOf && newToken) {
    const onBehalfQueryParams = new URLSearchParams();
    onBehalfQueryParams.set('onBehalfOf', newOnBehalfOf);
    onBehalfQueryParams.set('token', newToken);
    const { data } = await useFetch(`/api/users/onBehalfOf?${onBehalfQueryParams.toString()}`);
    user.value = data.value;
  }
});

export default function useOnBehalfOf() {
  return {
    onBehalfOf,
    token,
    user,
    reset,
  };
}
