/** @type {import('vue').Ref<import('~/server/db/schema/users').User>} */
let userData;

export const useUser = async () => {
  if (!userData) {
    ({ data: userData } = await useFetch('/api/users/me'));
  }
  const save = async () => {
    const body = structuredClone(toRaw(userData.value));
    if (body.loginProvider === 'IDA' || body.loginProvider === 'AMA') {
      body.name = null;
      body.address = null;
    }
    if (body.loginProvider === 'AMA') {
      body.identifierType = null;
      body.identifierValue = null;
    }

    await $fetch('/api/users/me', {
      method: 'PUT',
      body,
    });
  };
  return {
    userData,
    saveUserData: save,
  };
};
