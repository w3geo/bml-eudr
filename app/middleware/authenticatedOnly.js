export default defineNuxtRouteMiddleware(async (to) => {
  const userId = useUserSession().user.value?.login;
  if (!userId) {
    const redirect = useCookie('redirect');
    console.log('authenticatedOnly middleware: setting redirect to', to.fullPath);
    redirect.value = to.fullPath;
    return navigateTo('/account');
  }
});
