export default defineNuxtRouteMiddleware((to) => {
  const isAuthenticated = useUserSession().loggedIn.value;

  if (isAuthenticated) {
    const redirect = useCookie('redirect');
    const path = redirect.value;
    if (path) {
      redirect.value = undefined;
      return navigateTo(path);
    }
  }
});
