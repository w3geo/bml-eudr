/** @type {import('vue').Ref<import('~/server/db/schema/users').User>} */
let userData;

export const useUser = async () => {
  if (!userData) {
    ({ data: userData } = await useFetch('/api/users/me'));
  }
  const save = async () => {
    await $fetch('/api/users/me', {
      method: 'PUT',
      body: userData.value,
    });
  };
  return {
    userData,
    saveUserData: save,
  };
};
