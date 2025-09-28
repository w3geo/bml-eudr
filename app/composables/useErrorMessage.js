/** @type {import('vue').Ref<string|null>} */
const errorMessage = ref(null);
const displayErrorMessage = computed({
  get: () => !!errorMessage.value,
  set: (value) => {
    if (!value) {
      errorMessage.value = null;
    }
  },
});

export const useErrorMessage = () => {
  return {
    errorMessage,
    displayErrorMessage,
  };
};
