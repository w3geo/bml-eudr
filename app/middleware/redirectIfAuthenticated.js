export default defineNuxtRouteMiddleware(() => {
  const isAuthenticated = useUserSession().loggedIn.value;

  if (isAuthenticated) {
    const redirect = useCookie('redirect');
    const destination = redirect.value;
    console.log('redirectIfAuthenticated middleware: redirecting to', destination);
    if (destination) {
      redirect.value = undefined;
      return navigateTo(destination);
    }
  }
});
