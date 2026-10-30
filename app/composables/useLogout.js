export const useLogout = () => {
  const { session, clear } = useUserSession();
  const router = useRouter();
  return async () => {
    if (session.value?.loginProvider === 'USP') {
      // Also logs out from USP, which needs the session to still exist.
      window.location.href = './auth/usp?logout';
    } else {
      await clear();
      router.push('/');
    }
  };
};
