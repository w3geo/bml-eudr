export default defineNuxtRouteMiddleware((to) => {
  const isAuthenticated = useUserSession().loggedIn.value;

  if (!isAuthenticated) {
    const redirect = useCookie('redirect');
    redirect.value = to.fullPath;
    return navigateTo('/profile');
  }
});
