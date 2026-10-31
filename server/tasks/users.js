export default defineTask({
  meta: {
    name: 'users',
    description: 'Delete users who were inactive for years or never verified their login',
  },
  async run() {
    return { result: { deleted: await deleteStaleUsers() } };
  },
});
