export default defineNuxtRouteMiddleware(() => {
  const isAuthenticated = useUserSession().loggedIn.value;

  if (isAuthenticated) {
    const redirect = useCookie('redirect');
    const destination = redirect.value;
    if (destination) {
      redirect.value = undefined;
      return navigateTo(destination);
    }
  }
});
