export default defineNuxtRouteMiddleware(async (to) => {
  const userId = useUserSession().user.value?.login;
  if (!userId) {
    const redirect = useCookie('redirect');
    redirect.value = to.fullPath;
    return navigateTo('/account');
  }
});
